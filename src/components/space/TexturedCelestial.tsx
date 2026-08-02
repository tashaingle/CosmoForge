"use client";

/**
 * Photoreal-ish sun / planet / moon with texture maps, sun lighting,
 * optional atmosphere shell and rings.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture, Html } from "@react-three/drei";
import * as THREE from "three";
import type { BodyVisual } from "@/lib/body-visuals";

function LitTexturedSphere({
  radius,
  mapUrl,
  sunDir,
  roughness,
  metalness,
  tint,
  emissiveMap,
  emissiveIntensity = 0,
  segments = 64,
}: {
  radius: number;
  mapUrl: string;
  sunDir: THREE.Vector3;
  roughness: number;
  metalness: number;
  tint?: string;
  emissiveMap?: boolean;
  emissiveIntensity?: number;
  segments?: number;
}) {
  const map = useTexture(mapUrl);
  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 6;
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  }, [map]);

  const tintCol = useMemo(
    () => new THREE.Color(tint ?? "#ffffff"),
    [tint]
  );

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: map },
        uSunDir: { value: sunDir.clone() },
        uTint: { value: tintCol },
        uRough: { value: roughness },
        uMetal: { value: metalness },
        uEmissive: { value: emissiveIntensity },
        uCamPos: { value: new THREE.Vector3() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uSunDir;
        uniform vec3 uTint;
        uniform float uRough;
        uniform float uMetal;
        uniform float uEmissive;
        uniform vec3 uCamPos;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;

        void main() {
          vec3 base = texture2D(uMap, vUv).rgb * uTint;
          vec3 N = normalize(vNormalW);
          vec3 L = normalize(uSunDir);
          float ndl = max(dot(N, L), 0.0);
          float wrap = max(dot(N, L) * 0.5 + 0.5, 0.0);

          // Ambient + lambert with soft wrap so night isn't pure black
          float light = 0.06 + 0.94 * mix(ndl, wrap, 0.25);
          vec3 lit = base * light;

          // Soft specular for icy / metallic feel
          vec3 V = normalize(uCamPos - vPosW);
          vec3 H = normalize(L + V);
          float shiny = mix(12.0, 48.0, 1.0 - uRough);
          float spec = pow(max(dot(N, H), 0.0), shiny) * (0.15 + 0.45 * uMetal) * ndl;
          lit += vec3(1.0, 0.98, 0.92) * spec;

          // Self-lit bodies (sun)
          if (uEmissive > 0.01) {
            lit = base * (0.55 + 0.45 * uEmissive) + base * uEmissive * 0.5;
          }

          lit = pow(lit, vec3(0.95));
          gl_FragColor = vec4(lit, 1.0);
        }
      `,
    });
  }, [map, sunDir, tintCol, roughness, metalness, emissiveIntensity]);

  useFrame(({ camera }) => {
    mat.uniforms.uSunDir.value.copy(sunDir).normalize();
    mat.uniforms.uCamPos.value.copy(camera.position);
    mat.uniforms.uTint.value.copy(tintCol);
  });

  return (
    <mesh>
      <sphereGeometry args={[radius, segments, segments]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function AtmosphereFresnel({
  radius,
  color,
  intensity,
  scale,
}: {
  radius: number;
  color: string;
  intensity: number;
  scale: number;
}) {
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.8);
          gl_FragColor = vec4(uColor * fresnel * uIntensity * 1.4, fresnel * uIntensity);
        }
      `,
    });
  }, [color, intensity]);

  return (
    <mesh scale={[scale, scale, scale]}>
      <sphereGeometry args={[radius, 48, 48]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function PlanetRings({
  radius,
  rings,
}: {
  radius: number;
  rings: NonNullable<BodyVisual["rings"]>;
}) {
  const hasMap = Boolean(rings.map);
  // Always create a texture hook path — load a tiny fallback (saturn map) if no ring map
  const ringTex = useTexture(rings.map ?? "/textures/bodies/saturn.jpg");

  useLayoutEffect(() => {
    ringTex.colorSpace = THREE.SRGBColorSpace;
    ringTex.wrapS = THREE.ClampToEdgeWrapping;
    ringTex.wrapT = THREE.ClampToEdgeWrapping;
    ringTex.anisotropy = 4;
  }, [ringTex]);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: ringTex },
        uColor: { value: new THREE.Color(rings.color) },
        uOpacity: { value: rings.opacity },
        uUseMap: { value: hasMap ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uUseMap;
        varying vec2 vUv;
        void main() {
          // ringGeometry uv.x is radial-ish depending on three version — use vUv.y often radial
          float radial = vUv.y;
          float density;
          if (uUseMap > 0.5) {
            vec4 t = texture2D(uMap, vec2(radial, 0.5));
            density = max(t.a, max(t.r, max(t.g, t.b)));
          } else {
            // Procedural Cassini-style bands
            density = smoothstep(0.0, 0.08, radial) * smoothstep(1.0, 0.92, radial);
            density *= 0.55 + 0.45 * sin(radial * 40.0);
            density *= 1.0 - 0.65 * smoothstep(0.42, 0.48, radial) * smoothstep(0.55, 0.49, radial);
          }
          float a = density * uOpacity;
          if (a < 0.02) discard;
          gl_FragColor = vec4(uColor * (0.7 + 0.3 * density), a);
        }
      `,
    });
  }, [ringTex, rings.color, rings.opacity, hasMap]);

  return (
    <mesh rotation={[rings.tilt, 0, 0.12]}>
      <ringGeometry args={[radius * rings.inner, radius * rings.outer, 128]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function TexturedCelestial({
  radius,
  position,
  sunPosition,
  visual,
  label,
  showLabel,
  simMs,
  segments,
}: {
  radius: number;
  position: [number, number, number];
  sunPosition: [number, number, number];
  visual: BodyVisual;
  label: string;
  showLabel: boolean;
  simMs: number;
  segments?: number;
}) {
  const spinRef = useRef<THREE.Group>(null);
  const sunDir = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const isSun = (visual.emissiveIntensity ?? 0) > 0.5;

  useFrame(() => {
    sunDir
      .set(
        sunPosition[0] - position[0],
        sunPosition[1] - position[1],
        sunPosition[2] - position[2]
      )
      .normalize();
    // If almost co-located with sun, use a default light axis
    if (sunDir.lengthSq() < 1e-6) sunDir.set(1, 0.2, 0.1).normalize();

    if (spinRef.current && visual.spinDays !== 0) {
      const dayMs = 86400000 * Math.abs(visual.spinDays);
      const sign = visual.spinDays < 0 ? -1 : 1;
      const spin = sign * ((simMs / dayMs) % 1) * Math.PI * 2;
      spinRef.current.rotation.y = spin;
    }
  });

  if (!visual.map) return null;

  return (
    <group position={position}>
      {/* Axial tilt wraps spin + rings so rings stay equatorial */}
      <group rotation={[0, 0, visual.axialTilt ?? 0]}>
        <group ref={spinRef}>
          <LitTexturedSphere
            radius={radius}
            mapUrl={visual.map}
            sunDir={sunDir}
            roughness={visual.roughness}
            metalness={visual.metalness}
            tint={visual.tint}
            emissiveMap={visual.emissiveMap}
            emissiveIntensity={visual.emissiveIntensity ?? 0}
            segments={segments ?? (isSun ? 48 : 64)}
          />
        </group>
        {visual.atmosphere && (
          <AtmosphereFresnel
            radius={radius}
            color={visual.atmosphere.color}
            intensity={visual.atmosphere.intensity}
            scale={visual.atmosphere.scale}
          />
        )}
        {visual.rings && (
          <PlanetRings radius={radius} rings={visual.rings} />
        )}
      </group>

      {isSun && (
        <>
          <mesh scale={[1.35, 1.35, 1.35]}>
            <sphereGeometry args={[radius, 32, 32]} />
            <meshBasicMaterial
              color="#ffcc66"
              transparent
              opacity={0.22}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh scale={[2.1, 2.1, 2.1]}>
            <sphereGeometry args={[radius, 24, 24]} />
            <meshBasicMaterial
              color="#ff8800"
              transparent
              opacity={0.08}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <pointLight color="#ffd27a" intensity={4.5} distance={120} decay={0.3} />
          <pointLight color="#fff8e7" intensity={1.2} distance={55} decay={0.45} />
        </>
      )}

      {showLabel && (
        <Html
          distanceFactor={label === "Pluto" ? 10 : isSun ? 14 : 7}
          style={{ pointerEvents: "none" }}
        >
          <div
            className={`whitespace-nowrap rounded border bg-black/55 px-1.5 py-0.5 text-[10px] shadow ${
              isSun
                ? "border-amber-400/30 text-amber-100"
                : "border-white/15 text-cyan-50"
            }`}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

export function preloadBodyTextures(urls: string[]) {
  if (typeof window === "undefined") return;
  for (const u of urls) {
    const img = new Image();
    img.src = u;
  }
}

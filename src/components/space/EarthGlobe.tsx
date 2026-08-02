"use client";

/**
 * Google Earth–style Earth: day map, city lights, clouds, fresnel atmosphere.
 * Textures: three.js example planets pack (public domain / NASA-derived).
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const DAY = "/textures/earth/day.jpg";
const NIGHT = "/textures/earth/night.jpg";
const SPEC = "/textures/earth/specular.jpg";
const CLOUDS = "/textures/earth/clouds.jpg";

/** Axial tilt ~23.4° */
const AXIAL_TILT = (23.4 * Math.PI) / 180;

function EarthAtmosphere({ radius }: { radius: number }) {
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color("#5eb0ff") },
        uPower: { value: 3.2 },
        uIntensity: { value: 1.15 },
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
        uniform float uPower;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), uPower);
          gl_FragColor = vec4(uColor * fresnel * uIntensity, fresnel * 0.95);
        }
      `,
    });
  }, []);

  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function EarthSurface({
  radius,
  sunDir,
}: {
  radius: number;
  sunDir: THREE.Vector3;
}) {
  const day = useTexture(DAY);
  const night = useTexture(NIGHT);
  const specular = useTexture(SPEC);

  useLayoutEffect(() => {
    for (const t of [day, night]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    }
    specular.colorSpace = THREE.NoColorSpace;
    specular.anisotropy = 8;
    specular.wrapS = specular.wrapT = THREE.ClampToEdgeWrapping;
  }, [day, night, specular]);

  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      lights: false,
      uniforms: {
        uDay: { value: day },
        uNight: { value: night },
        uSpec: { value: specular },
        uSunDir: { value: sunDir.clone() },
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
        uniform sampler2D uDay;
        uniform sampler2D uNight;
        uniform sampler2D uSpec;
        uniform vec3 uSunDir;
        uniform vec3 uCamPos;
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vPosW;

        void main() {
          vec3 N = normalize(vNormalW);
          vec3 L = normalize(uSunDir);
          float ndl = dot(N, L);
          float dayF = smoothstep(-0.08, 0.35, ndl);
          float nightF = 1.0 - smoothstep(-0.05, 0.25, ndl);

          vec3 dayCol = texture2D(uDay, vUv).rgb;
          vec3 nightCol = texture2D(uNight, vUv).rgb;
          float ocean = texture2D(uSpec, vUv).r;

          // Soft ambient so dark side isn't pure black
          vec3 ambient = dayCol * 0.04;
          vec3 lit = dayCol * (0.15 + 0.9 * dayF);

          // City lights (boosted for game readability)
          vec3 cities = nightCol * nightF * 1.6;

          // Ocean specular glint
          vec3 V = normalize(uCamPos - vPosW);
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 48.0) * ocean * dayF;
          vec3 highlight = vec3(0.55, 0.7, 1.0) * spec * 0.85;

          // Subtle limb darkening
          float limb = 0.75 + 0.25 * max(dot(N, V), 0.0);

          vec3 col = (ambient + lit + cities + highlight) * limb;
          // Slight contrast lift toward Google Earth punch
          col = pow(col, vec3(0.92));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    return m;
  }, [day, night, specular, sunDir]);

  useFrame(({ camera }) => {
    mat.uniforms.uSunDir.value.copy(sunDir).normalize();
    mat.uniforms.uCamPos.value.copy(camera.position);
  });

  return (
    <mesh>
      <sphereGeometry args={[radius, 96, 96]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function CloudLayer({
  radius,
  sunDir,
}: {
  radius: number;
  sunDir: THREE.Vector3;
}) {
  const clouds = useTexture(CLOUDS);
  useLayoutEffect(() => {
    clouds.colorSpace = THREE.SRGBColorSpace;
    clouds.anisotropy = 4;
    clouds.wrapS = clouds.wrapT = THREE.ClampToEdgeWrapping;
  }, [clouds]);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uClouds: { value: clouds },
        uSunDir: { value: sunDir.clone() },
        uOpacity: { value: 0.42 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          vUv = uv;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uClouds;
        uniform vec3 uSunDir;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          float c = texture2D(uClouds, vUv).r;
          float ndl = max(dot(normalize(vNormalW), normalize(uSunDir)), 0.0);
          float lit = 0.25 + 0.75 * ndl;
          float a = c * uOpacity * (0.55 + 0.45 * lit);
          gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * lit, a);
        }
      `,
    });
  }, [clouds, sunDir]);

  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    mat.uniforms.uSunDir.value.copy(sunDir).normalize();
    if (ref.current) ref.current.rotation.y += dt * 0.012;
  });

  return (
    <mesh ref={ref} scale={[1.015, 1.015, 1.015]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function EarthGlobe({
  radius,
  position,
  sunPosition,
  showLabel,
  simMs,
}: {
  radius: number;
  position: [number, number, number];
  sunPosition: [number, number, number];
  showLabel: boolean;
  /** Mission sim time — drives slow Earth rotation */
  simMs: number;
}) {
  const group = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const sunDir = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  useFrame(() => {
    sunDir
      .set(
        sunPosition[0] - position[0],
        sunPosition[1] - position[1],
        sunPosition[2] - position[2]
      )
      .normalize();

    if (lightRef.current) {
      lightRef.current.position.set(
        sunDir.x * 8,
        sunDir.y * 8,
        sunDir.z * 8
      );
    }

    if (group.current) {
      // ~1 rotation / day in sim time (visual, slightly sped for readability)
      const dayMs = 86400000;
      const spin = ((simMs / dayMs) % 1) * Math.PI * 2;
      group.current.rotation.y = spin;
    }
  });

  return (
    <group position={position}>
      {/* Local sun key light — Google Earth punch on the globe */}
      <directionalLight
        ref={lightRef}
        intensity={1.75}
        color="#fff4e0"
      />
      <group ref={group} rotation={[0, 0, AXIAL_TILT * 0.35]}>
        <EarthSurface radius={radius} sunDir={sunDir} />
        <CloudLayer radius={radius} sunDir={sunDir} />
        <EarthAtmosphere radius={radius} />
      </group>
      {/* Soft outer haze */}
      <mesh scale={[1.28, 1.28, 1.28]}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/** Preload textures so first Earth focus is snappy */
export function preloadEarthTextures() {
  // Called from scene; drei useTexture.preload if available
  if (typeof window === "undefined") return;
  const urls = [DAY, NIGHT, SPEC, CLOUDS];
  for (const u of urls) {
    const img = new Image();
    img.src = u;
  }
}

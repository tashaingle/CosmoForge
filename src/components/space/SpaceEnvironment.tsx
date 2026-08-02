"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft circular sprite — raw Points without a map render as ugly white squares */
let _circleTex: THREE.CanvasTexture | null = null;
export function getCirclePointTexture(): THREE.CanvasTexture {
  if (_circleTex) return _circleTex;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(0.7, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _circleTex = new THREE.CanvasTexture(canvas);
  _circleTex.needsUpdate = true;
  _circleTex.colorSpace = THREE.SRGBColorSpace;
  return _circleTex;
}

function makeRingPositions(
  count: number,
  rMin: number,
  rMax: number,
  ySpread: number,
  seed: number
) {
  const rand = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Prefer mid-belt density (Kirkwood-ish hollow is subtle)
    const u = rand();
    const r = rMin + (rMax - rMin) * (0.15 + 0.85 * Math.pow(u, 0.7));
    const theta = rand() * Math.PI * 2;
    // Flatter disk — real belt is thin
    const y = (rand() - 0.5) * 2 * ySpread * (0.4 + 0.6 * rand());
    pos[i * 3] = r * Math.cos(theta);
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = r * Math.sin(theta);
  }
  return pos;
}

/**
 * Soft dust / distant grain (circular sprites).
 * This is the main-belt dust, zodiacal light grit, Trojans, Kuiper haze.
 */
export function ParticleCloud({
  count,
  rMin,
  rMax,
  ySpread = 0.06,
  size = 0.02,
  color = "#9ca3af",
  opacity = 0.45,
  seed = 1,
}: {
  count: number;
  rMin: number;
  rMax: number;
  ySpread?: number;
  size?: number;
  color?: string;
  opacity?: number;
  seed?: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = makeRingPositions(count, rMin, rMax, ySpread, seed);
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count, rMin, rMax, ySpread, seed]);

  const map = useMemo(() => {
    if (typeof document === "undefined") return null;
    return getCirclePointTexture();
  }, []);

  if (!map) return null;

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={map}
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        alphaTest={0.01}
      />
    </points>
  );
}

/** Rocky main-belt asteroids — muted grays, irregular, sun-lit */
export function AsteroidRocks({
  count = 480,
  rMin = 2.1,
  rMax = 3.3,
  seed = 99,
}: {
  count?: number;
  rMin?: number;
  rMax?: number;
  seed?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Palette: C-type dark, S-type gray-tan, M-type slightly metallic
  const palette = useMemo(
    () => [
      new THREE.Color("#4a453f"),
      new THREE.Color("#5c564c"),
      new THREE.Color("#6b6358"),
      new THREE.Color("#3d3a36"),
      new THREE.Color("#7a7268"),
      new THREE.Color("#55504a"),
    ],
    []
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const rand = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      const r = rMin + rand() * (rMax - rMin);
      const theta = rand() * Math.PI * 2;
      // Thin disk ~0.05 AU scale in scene units
      const y = (rand() - 0.5) * 0.08;
      dummy.position.set(r * Math.cos(theta), y, r * Math.sin(theta));
      // Mostly tiny; a few larger rocks
      const big = rand() > 0.97;
      const s = big
        ? 0.012 + rand() * 0.018
        : 0.0025 + rand() * 0.007;
      dummy.scale.set(
        s * (0.7 + rand() * 0.6),
        s * (0.45 + rand() * 0.7),
        s * (0.55 + rand() * 0.7)
      );
      dummy.rotation.set(rand() * 6, rand() * 6, rand() * 6);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.copy(palette[Math.floor(rand() * palette.length)]);
      // Slight random brightness
      color.multiplyScalar(0.75 + rand() * 0.45);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, rMin, rMax, seed, dummy, color, palette]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      {/* Low-poly irregular rock */}
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#666666"
        roughness={0.95}
        metalness={0.08}
        flatShading
        vertexColors
      />
    </instancedMesh>
  );
}

/** Subtle zodiacal light along the ecliptic — not a solid disc */
export function EclipticDust() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={-1}>
      <ringGeometry args={[0.6, 12, 96]} />
      <meshBasicMaterial
        color="#6b7c93"
        transparent
        opacity={0.035}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function MilkyWayBand() {
  const geometry = useMemo(() => {
    const rand = mulberry32(42);
    const n = 5000;
    const pos = new Float32Array(n * 3);
    const R = 70;
    for (let i = 0; i < n; i++) {
      const lon = rand() * Math.PI * 2;
      const lat = (rand() - 0.5) * 0.4;
      const x = R * Math.cos(lat) * Math.cos(lon);
      const y = R * Math.sin(lat) + R * 0.1 * Math.sin(lon * 2);
      const z = R * Math.cos(lat) * Math.sin(lon);
      const tilt = 0.5;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y * Math.cos(tilt) - z * Math.sin(tilt);
      pos[i * 3 + 2] = y * Math.sin(tilt) + z * Math.cos(tilt);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const map = useMemo(() => {
    if (typeof document === "undefined") return null;
    return getCirclePointTexture();
  }, []);

  if (!map) return null;

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={map}
        size={0.28}
        color="#b8c4d4"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        alphaTest={0.01}
      />
    </points>
  );
}

export function DeepStarfield() {
  return (
    <>
      <Stars
        radius={100}
        depth={70}
        count={9000}
        factor={3.2}
        saturation={0.15}
        fade
        speed={0.08}
      />
      <Stars
        radius={85}
        depth={50}
        count={3000}
        factor={4.5}
        saturation={0.35}
        fade
        speed={0.03}
      />
      <MilkyWayBand />
    </>
  );
}

export function SunGlow() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshBasicMaterial
          color="#ffcc66"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshBasicMaterial
          color="#ff9944"
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.75, 24, 24]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight color="#ffd27a" intensity={4.2} distance={120} decay={0.3} />
      <pointLight color="#fff8e7" intensity={1.1} distance={50} decay={0.45} />
    </group>
  );
}

export function AtmosphereShell({
  radius,
  color,
  intensity = 0.4,
}: {
  radius: number;
  color: string;
  intensity?: number;
}) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.22, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={intensity}
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function GasGiantSheen({
  radius,
  color,
}: {
  radius: number;
  color: string;
}) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.08, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Soft main-belt dust band (replaces the bright gold guide line) */
export function BeltGuideRing() {
  const map = useMemo(() => {
    if (typeof document === "undefined") return null;
    return getCirclePointTexture();
  }, []);

  const geometry = useMemo(() => {
    const rand = mulberry32(77);
    const n = 2200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2.15 + rand() * 1.15;
      const theta = rand() * Math.PI * 2;
      const y = (rand() - 0.5) * 0.05;
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  if (!map) return null;

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={map}
        size={0.028}
        color="#8a8680"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        alphaTest={0.01}
      />
    </points>
  );
}

/** Full main-belt package: dust + rocks + faint structure */
export function MainAsteroidBelt({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <group>
      {/* Distant grit — soft gray, not yellow squares */}
      <ParticleCloud
        count={3500}
        rMin={2.05}
        rMax={3.35}
        ySpread={0.055}
        size={0.018}
        color="#7c7872"
        opacity={0.5}
        seed={11}
      />
      <ParticleCloud
        count={1800}
        rMin={2.2}
        rMax={3.15}
        ySpread={0.04}
        size={0.012}
        color="#6b6560"
        opacity={0.35}
        seed={22}
      />
      <AsteroidRocks count={520} rMin={2.08} rMax={3.32} seed={99} />
      <BeltGuideRing />
    </group>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

/** Seeded PRNG for stable particle fields */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Annular / spherical particle cloud (asteroid belt, Kuiper, dust).
 */
export function ParticleCloud({
  count,
  rMin,
  rMax,
  ySpread = 0.04,
  size = 0.012,
  color = "#c4b5a0",
  opacity = 0.55,
  seed = 1,
  twinkle = false,
}: {
  count: number;
  rMin: number;
  rMax: number;
  ySpread?: number;
  size?: number;
  color?: string;
  opacity?: number;
  seed?: number;
  twinkle?: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const rand = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rand();
      const r = Math.sqrt(rMin * rMin + u * (rMax * rMax - rMin * rMin));
      const theta = rand() * Math.PI * 2;
      const y = (rand() - 0.5) * 2 * ySpread * r;
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);
    }
    return pos;
  }, [count, rMin, rMax, ySpread, seed]);

  useFrame(({ clock }) => {
    if (!twinkle || !ref.current) return;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = opacity * (0.75 + 0.25 * Math.sin(clock.elapsedTime * 0.4));
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Soft ecliptic dust disc */
export function EclipticDust() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={-1}>
      <ringGeometry args={[0.35, 12, 96]} />
      <meshBasicMaterial
        color="#8b9cb3"
        transparent
        opacity={0.035}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Milky Way-ish band of dense stars */
export function MilkyWayBand() {
  const positions = useMemo(() => {
    const rand = mulberry32(42);
    const n = 4000;
    const pos = new Float32Array(n * 3);
    const R = 55;
    for (let i = 0; i < n; i++) {
      const lon = rand() * Math.PI * 2;
      // band around a tilted great circle
      const lat = (rand() - 0.5) * 0.35;
      const x = R * Math.cos(lat) * Math.cos(lon);
      const y = R * Math.sin(lat) + R * 0.15 * Math.sin(lon * 2);
      const z = R * Math.cos(lat) * Math.sin(lon);
      // tilt
      const tilt = 0.45;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y * Math.cos(tilt) - z * Math.sin(tilt);
      pos[i * 3 + 2] = y * Math.sin(tilt) + z * Math.cos(tilt);
    }
    return pos;
  }, []);

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.09}
        color="#dbeafe"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function DeepStarfield() {
  return (
    <>
      <Stars
        radius={90}
        depth={60}
        count={8000}
        factor={3.5}
        saturation={0.15}
        fade
        speed={0.15}
      />
      <Stars
        radius={70}
        depth={40}
        count={2500}
        factor={5}
        saturation={0.4}
        fade
        speed={0.05}
      />
      <MilkyWayBand />
    </>
  );
}

export function SunGlow() {
  return (
    <group>
      {/* Photosphere handled by body mesh; add corona layers */}
      <mesh>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshBasicMaterial
          color="#ffcc66"
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshBasicMaterial
          color="#ff9944"
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.035}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight color="#ffd27a" intensity={3.2} distance={100} decay={0.35} />
      <pointLight color="#fff5e0" intensity={0.6} distance={40} decay={0.5} />
    </group>
  );
}

export function AtmosphereShell({
  radius,
  color,
  intensity = 0.35,
}: {
  radius: number;
  color: string;
  intensity?: number;
}) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.18, 32, 32]} />
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

/** Soft planetary limb glow for gas giants */
export function GasGiantSheen({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.06, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.2}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

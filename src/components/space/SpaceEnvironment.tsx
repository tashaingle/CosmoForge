"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Stars, Line } from "@react-three/drei";
import * as THREE from "three";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
    const u = rand();
    const r = rMin + (rMax - rMin) * Math.pow(u, 0.85);
    const theta = rand() * Math.PI * 2;
    const y = (rand() - 0.5) * 2 * ySpread;
    pos[i * 3] = r * Math.cos(theta);
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = r * Math.sin(theta);
  }
  return pos;
}

/** Point cloud with real BufferGeometry (R3F-safe) */
export function ParticleCloud({
  count,
  rMin,
  rMax,
  ySpread = 0.08,
  size = 0.04,
  color = "#e7d3b0",
  opacity = 0.85,
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

  return (
    <points geometry={geometry} frustumCulled={false}>
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

/** Visible rocky bodies in the main belt */
export function AsteroidRocks({
  count = 1200,
  rMin = 2.05,
  rMax = 3.35,
  seed = 99,
}: {
  count?: number;
  rMin?: number;
  rMax?: number;
  seed?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const rand = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      const r = rMin + rand() * (rMax - rMin);
      const theta = rand() * Math.PI * 2;
      const y = (rand() - 0.5) * 0.14;
      dummy.position.set(r * Math.cos(theta), y, r * Math.sin(theta));
      const s = 0.014 + rand() * 0.032;
      dummy.scale.set(s, s * (0.55 + rand() * 0.9), s * (0.45 + rand()));
      dummy.rotation.set(rand() * 6, rand() * 6, rand() * 6);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, rMin, rMax, seed, dummy]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#b5a99a"
        roughness={0.92}
        metalness={0.12}
        flatShading
      />
    </instancedMesh>
  );
}

export function EclipticDust() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={-1}>
      <ringGeometry args={[0.5, 14, 128]} />
      <meshBasicMaterial
        color="#9fb4d0"
        transparent
        opacity={0.07}
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
    const n = 7000;
    const pos = new Float32Array(n * 3);
    const R = 60;
    for (let i = 0; i < n; i++) {
      const lon = rand() * Math.PI * 2;
      const lat = (rand() - 0.5) * 0.55;
      const x = R * Math.cos(lat) * Math.cos(lon);
      const y = R * Math.sin(lat) + R * 0.12 * Math.sin(lon * 2);
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

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.16}
        color="#e0f2fe"
        transparent
        opacity={0.7}
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
        radius={100}
        depth={70}
        count={12000}
        factor={4.5}
        saturation={0.25}
        fade
        speed={0.12}
      />
      <Stars
        radius={80}
        depth={45}
        count={4000}
        factor={6}
        saturation={0.5}
        fade
        speed={0.04}
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

/** Gold guide ring through the middle of the main belt */
export function BeltGuideRing() {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const r = 2.7;
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * r, 0.03, Math.sin(t) * r));
    }
    return pts;
  }, []);
  return (
    <Line
      points={points}
      color="#fbbf24"
      lineWidth={2}
      transparent
      opacity={0.55}
    />
  );
}

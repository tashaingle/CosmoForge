"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { PLANETS, type PlanetId } from "@/lib/constants";
import {
  craftScenePosition,
  planetPositionAU,
  type OrbitElements,
} from "@/lib/orbital";

interface SolarSystemSceneProps {
  simMs: number;
  craftOrbit?: OrbitElements | null;
  craftName?: string;
  focus: "system" | "craft" | PlanetId;
}

function OrbitRing({ radius, color }: { radius: number; color: string }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const t = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
    }
    return pts;
  }, [radius]);

  return (
    <Line points={points} color={color} lineWidth={0.5} transparent opacity={0.25} />
  );
}

function PlanetBody({
  planetId,
  simMs,
  showLabel,
}: {
  planetId: PlanetId;
  simMs: number;
  showLabel: boolean;
}) {
  const def = PLANETS.find((p) => p.id === planetId)!;
  const pos = planetPositionAU(planetId, simMs);

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <mesh>
        <sphereGeometry args={[def.visualRadius, 32, 32]} />
        <meshStandardMaterial
          color={def.color}
          emissive={def.emissive ?? "#000000"}
          emissiveIntensity={def.id === "sun" ? 1.2 : 0.05}
          roughness={0.55}
          metalness={0.15}
        />
      </mesh>
      {def.id === "sun" && (
        <pointLight color="#ffd27a" intensity={2.5} distance={80} decay={0.4} />
      )}
      {def.id === "saturn" && (
        <mesh rotation={[Math.PI / 2.4, 0, 0.2]}>
          <ringGeometry args={[def.visualRadius * 1.3, def.visualRadius * 2.1, 64]} />
          <meshBasicMaterial
            color="#d4c4a0"
            side={THREE.DoubleSide}
            transparent
            opacity={0.55}
          />
        </mesh>
      )}
      {showLabel && (
        <Html distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-cyan-100 whitespace-nowrap border border-white/10">
            {def.name}
          </div>
        </Html>
      )}
    </group>
  );
}

function CraftMarker({
  orbit,
  simMs,
  name,
}: {
  orbit: OrbitElements;
  simMs: number;
  name: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Vector3[]>([]);

  useFrame(() => {
    if (!ref.current) return;
    const p = craftScenePosition(orbit, simMs);
    ref.current.position.set(p.x, p.y, p.z);
    trail.current.push(new THREE.Vector3(p.x, p.y, p.z));
    if (trail.current.length > 80) trail.current.shift();
  });

  const trailPoints = trail.current.length > 1 ? trail.current : [new THREE.Vector3()];

  return (
    <>
      <group ref={ref}>
        <mesh>
          <octahedronGeometry args={[0.018, 0]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#22d3ee"
            emissiveIntensity={0.9}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.15} />
        </mesh>
        <Html distanceFactor={6} position={[0.03, 0.04, 0]}>
          <div className="rounded-md bg-cyan-950/80 px-2 py-1 text-[11px] text-cyan-50 border border-cyan-400/40 shadow-lg whitespace-nowrap">
            ✦ {name}
          </div>
        </Html>
      </group>
      {trail.current.length > 2 && (
        <Line points={trailPoints} color="#22d3ee" lineWidth={1} transparent opacity={0.45} />
      )}
    </>
  );
}

function CraftOrbitPreview({ orbit, simMs }: { orbit: OrbitElements; simMs: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const samples = 96;
    // Sample one orbital period worth of positions from current epoch
    const spanMs =
      orbit.centralBody === "earth"
        ? 90 * 60 * 1000 // ~90 min LEO visual ring
        : 200 * 24 * 3600 * 1000; // ~200 days heliocentric
    for (let i = 0; i <= samples; i++) {
      const t = simMs + (i / samples) * spanMs;
      const p = craftScenePosition(orbit, t);
      pts.push(new THREE.Vector3(p.x, p.y, p.z));
    }
    return pts;
  }, [orbit, simMs]);

  return <Line points={points} color="#67e8f9" lineWidth={1} transparent opacity={0.35} />;
}

function CameraRig({
  focus,
  simMs,
  craftOrbit,
}: {
  focus: SolarSystemSceneProps["focus"];
  simMs: number;
  craftOrbit?: OrbitElements | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    let target = new THREE.Vector3(0, 0, 0);
    if (focus === "craft" && craftOrbit) {
      const p = craftScenePosition(craftOrbit, simMs);
      target.set(p.x, p.y, p.z);
    } else if (focus !== "system" && focus !== "craft") {
      const p = planetPositionAU(focus, simMs);
      target.set(p.x, p.y, p.z);
    }
    c.target.lerp(target, 0.08);
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.15}
      maxDistance={55}
      maxPolarAngle={Math.PI * 0.92}
    />
  );
}

export function SolarSystemScene({
  simMs,
  craftOrbit,
  craftName = "Craft",
  focus,
}: SolarSystemSceneProps) {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.12} />
      <Stars radius={80} depth={40} count={5000} factor={3} saturation={0} fade speed={0.4} />

      {PLANETS.filter((p) => p.id !== "sun").map((p) => (
        <OrbitRing key={p.id} radius={p.a} color="#334155" />
      ))}

      {PLANETS.map((p) => (
        <PlanetBody
          key={p.id}
          planetId={p.id}
          simMs={simMs}
          showLabel={p.id !== "sun"}
        />
      ))}

      {craftOrbit && (
        <>
          <CraftOrbitPreview orbit={craftOrbit} simMs={simMs} />
          <CraftMarker orbit={craftOrbit} simMs={simMs} name={craftName} />
        </>
      )}

      <CameraRig focus={focus} simMs={simMs} craftOrbit={craftOrbit} />
    </>
  );
}

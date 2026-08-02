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
import type { LiveCraftMarker } from "@/lib/types";
import { getSkin } from "@/lib/cosmetics";

interface SolarSystemSceneProps {
  simMs: number;
  craftOrbit?: OrbitElements | null;
  craftName?: string;
  craftSkinId?: string;
  focus: "system" | "craft" | PlanetId;
  otherCrafts?: LiveCraftMarker[];
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
    <Line
      points={points}
      color={color}
      lineWidth={0.5}
      transparent
      opacity={0.25}
    />
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
          <ringGeometry
            args={[def.visualRadius * 1.3, def.visualRadius * 2.1, 64]}
          />
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
          <div className="whitespace-nowrap rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-[10px] text-cyan-100">
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
  subtitle,
  color = "#22d3ee",
  size = 0.018,
  showTrail = true,
}: {
  orbit: OrbitElements;
  simMs: number;
  name: string;
  subtitle?: string;
  color?: string;
  size?: number;
  showTrail?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Vector3[]>([]);

  useFrame(() => {
    if (!ref.current) return;
    const p = craftScenePosition(orbit, simMs);
    ref.current.position.set(p.x, p.y, p.z);
    if (showTrail) {
      trail.current.push(new THREE.Vector3(p.x, p.y, p.z));
      if (trail.current.length > 60) trail.current.shift();
    }
  });

  const trailPoints =
    trail.current.length > 1 ? trail.current : [new THREE.Vector3()];

  return (
    <>
      <group ref={ref}>
        <mesh>
          <octahedronGeometry args={[size, 0]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive={color}
            emissiveIntensity={0.9}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[size * 2.2, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
        <Html distanceFactor={6} position={[size * 1.6, size * 2.2, 0]}>
          <div
            className="max-w-[140px] truncate whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] shadow-lg sm:text-[11px]"
            style={{
              background: `${color}22`,
              borderColor: `${color}66`,
              color: "#f8fafc",
            }}
          >
            {name}
            {subtitle ? (
              <span className="block text-[9px] opacity-70">{subtitle}</span>
            ) : null}
          </div>
        </Html>
      </group>
      {showTrail && trail.current.length > 2 && (
        <Line
          points={trailPoints}
          color={color}
          lineWidth={1}
          transparent
          opacity={0.4}
        />
      )}
    </>
  );
}

function CraftOrbitPreview({
  orbit,
  simMs,
}: {
  orbit: OrbitElements;
  simMs: number;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const samples = 96;
    const spanMs =
      orbit.centralBody === "earth"
        ? 90 * 60 * 1000
        : 200 * 24 * 3600 * 1000;
    for (let i = 0; i <= samples; i++) {
      const t = simMs + (i / samples) * spanMs;
      const p = craftScenePosition(orbit, t);
      pts.push(new THREE.Vector3(p.x, p.y, p.z));
    }
    return pts;
  }, [orbit, simMs]);

  return (
    <Line
      points={points}
      color="#67e8f9"
      lineWidth={1}
      transparent
      opacity={0.35}
    />
  );
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

const OTHER_COLORS = ["#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#60a5fa"];

export function SolarSystemScene({
  simMs,
  craftOrbit,
  craftName = "Craft",
  craftSkinId,
  focus,
  otherCrafts = [],
}: SolarSystemSceneProps) {
  const playerColor = getSkin(craftSkinId).color;

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.12} />
      <Stars
        radius={80}
        depth={40}
        count={4500}
        factor={3}
        saturation={0}
        fade
        speed={0.4}
      />

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

      {otherCrafts.map((oc, i) => (
        <CraftMarker
          key={oc.id}
          orbit={oc.orbit}
          simMs={simMs}
          name={oc.name}
          subtitle={oc.commanderName}
          color={
            oc.skinId
              ? getSkin(oc.skinId).color
              : OTHER_COLORS[i % OTHER_COLORS.length]
          }
          size={0.012}
          showTrail={false}
        />
      ))}

      {craftOrbit && (
        <>
          <CraftOrbitPreview orbit={craftOrbit} simMs={simMs} />
          <CraftMarker
            orbit={craftOrbit}
            simMs={simMs}
            name={craftName}
            color={playerColor}
          />
        </>
      )}

      <CameraRig focus={focus} simMs={simMs} craftOrbit={craftOrbit} />
    </>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MOONS, PLANETS, type BodyId, getBody, bodyPositionAU } from "@/lib/bodies";
import { craftScenePosition, type OrbitElements } from "@/lib/orbital";
import type { LiveCraftMarker } from "@/lib/types";
import { getSkin } from "@/lib/cosmetics";
import {
  AtmosphereShell,
  DeepStarfield,
  EclipticDust,
  GasGiantSheen,
  ParticleCloud,
  SunGlow,
} from "./SpaceEnvironment";

interface SolarSystemSceneProps {
  simMs: number;
  craftOrbit?: OrbitElements | null;
  craftName?: string;
  craftSkinId?: string;
  focus: "system" | "craft" | BodyId;
  otherCrafts?: LiveCraftMarker[];
}

function OrbitRing({
  radius,
  color,
  opacity = 0.28,
}: {
  radius: number;
  color: string;
  opacity?: number;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
    }
    return pts;
  }, [radius]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={0.6}
      transparent
      opacity={opacity}
    />
  );
}

function BodyMesh({
  bodyId,
  simMs,
  showLabel,
  scale = 1,
}: {
  bodyId: BodyId;
  simMs: number;
  showLabel: boolean;
  scale?: number;
}) {
  const def = getBody(bodyId)!;
  const pos = bodyPositionAU(bodyId, simMs);
  const r = def.visualRadius * scale;

  if (def.id === "sun") {
    return (
      <group position={[pos.x, pos.y, pos.z]}>
        <mesh>
          <sphereGeometry args={[r, 48, 48]} />
          <meshStandardMaterial
            color="#ffe566"
            emissive="#ff9900"
            emissiveIntensity={1.4}
            roughness={0.35}
            metalness={0.05}
          />
        </mesh>
        <SunGlow />
        {showLabel && (
          <Html distanceFactor={14} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded border border-amber-400/30 bg-black/50 px-1.5 py-0.5 text-[10px] text-amber-100">
              Sun
            </div>
          </Html>
        )}
      </group>
    );
  }

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <mesh>
        <sphereGeometry args={[r, 36, 36]} />
        <meshStandardMaterial
          color={def.color}
          emissive={def.color}
          emissiveIntensity={0.08}
          roughness={def.kind === "planet" && def.a > 4 ? 0.45 : 0.65}
          metalness={def.kind === "dwarf" ? 0.25 : 0.1}
        />
      </mesh>

      {/* Atmospheres / sheens */}
      {def.id === "earth" && (
        <AtmosphereShell radius={r} color="#60a5fa" intensity={0.4} />
      )}
      {def.id === "venus" && (
        <AtmosphereShell radius={r} color="#fde68a" intensity={0.28} />
      )}
      {def.id === "mars" && (
        <AtmosphereShell radius={r} color="#fb923c" intensity={0.15} />
      )}
      {def.id === "jupiter" && (
        <GasGiantSheen radius={r} color="#f0c890" />
      )}
      {def.id === "saturn" && (
        <>
          <GasGiantSheen radius={r} color="#f5e6c8" />
          <mesh rotation={[Math.PI / 2.35, 0, 0.18]}>
            <ringGeometry args={[r * 1.25, r * 2.2, 96]} />
            <meshBasicMaterial
              color="#e8d5a8"
              side={THREE.DoubleSide}
              transparent
              opacity={0.65}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2.35, 0, 0.18]}>
            <ringGeometry args={[r * 1.55, r * 1.7, 64]} />
            <meshBasicMaterial
              color="#1e293b"
              side={THREE.DoubleSide}
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
      {def.id === "uranus" && (
        <mesh rotation={[0.2, 0, Math.PI / 2.1]}>
          <ringGeometry args={[r * 1.4, r * 1.85, 48]} />
          <meshBasicMaterial
            color="#a5f3fc"
            side={THREE.DoubleSide}
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </mesh>
      )}
      {def.id === "neptune" && (
        <GasGiantSheen radius={r} color="#3b82f6" />
      )}

      {showLabel && (
        <Html
          distanceFactor={bodyId === "pluto" ? 10 : 7}
          style={{ pointerEvents: "none" }}
        >
          <div className="whitespace-nowrap rounded border border-white/15 bg-black/55 px-1.5 py-0.5 text-[10px] text-cyan-50 shadow">
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
      if (trail.current.length > 70) trail.current.shift();
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
            emissiveIntensity={1}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[size * 2.4, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
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
          opacity={0.45}
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
        : 400 * 24 * 3600 * 1000;
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
      opacity={0.4}
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
      const p = bodyPositionAU(focus, simMs);
      target.set(p.x, p.y, p.z);
    }
    c.target.lerp(target, 0.08);
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.08}
      maxDistance={90}
      maxPolarAngle={Math.PI * 0.92}
    />
  );
}

const OTHER_COLORS = ["#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#60a5fa"];

function visibleMoons(focus: SolarSystemSceneProps["focus"]) {
  if (focus === "system") {
    return MOONS.filter((m) =>
      ["moon", "europa", "titan", "ganymede"].includes(m.id)
    );
  }
  if (focus === "craft") {
    return MOONS.filter((m) =>
      ["moon", "europa", "titan", "io", "ganymede", "callisto"].includes(m.id)
    );
  }
  const body = getBody(focus);
  if (!body) return [];
  if (body.kind === "moon") {
    return MOONS.filter(
      (m) => m.id === body.id || m.parentId === body.parentId
    );
  }
  return MOONS.filter((m) => m.parentId === focus);
}

export function SolarSystemScene({
  simMs,
  craftOrbit,
  craftName = "Craft",
  craftSkinId,
  focus,
  otherCrafts = [],
}: SolarSystemSceneProps) {
  const playerColor = getSkin(craftSkinId).color;
  const moons = visibleMoons(focus);

  return (
    <>
      <color attach="background" args={["#01040f"]} />
      <fog attach="fog" args={["#01040f", 35, 95]} />
      <ambientLight intensity={0.08} />
      <hemisphereLight args={["#1e293b", "#020617", 0.35]} />

      <DeepStarfield />
      <EclipticDust />

      {/* Main asteroid belt ~2.1–3.3 AU */}
      <ParticleCloud
        count={2800}
        rMin={2.05}
        rMax={3.35}
        ySpread={0.035}
        size={0.014}
        color="#d6c4a8"
        opacity={0.55}
        seed={11}
      />
      {/* Inner belt / Hungarias hint */}
      <ParticleCloud
        count={600}
        rMin={1.85}
        rMax={2.1}
        ySpread={0.02}
        size={0.01}
        color="#a8a29e"
        opacity={0.35}
        seed={22}
      />
      {/* Trojan-ish clumps near Jupiter orbit (simplified) */}
      <ParticleCloud
        count={400}
        rMin={4.9}
        rMax={5.4}
        ySpread={0.05}
        size={0.012}
        color="#c4b5a0"
        opacity={0.3}
        seed={33}
      />
      {/* Kuiper belt hint */}
      <ParticleCloud
        count={1800}
        rMin={32}
        rMax={48}
        ySpread={0.08}
        size={0.04}
        color="#94a3b8"
        opacity={0.35}
        seed={44}
      />
      {/* Zodiacal dust near sun */}
      <ParticleCloud
        count={500}
        rMin={0.4}
        rMax={1.6}
        ySpread={0.015}
        size={0.02}
        color="#fff7ed"
        opacity={0.12}
        seed={55}
        twinkle
      />

      {PLANETS.filter((p) => p.id !== "sun" && p.kind !== "moon").map((p) => (
        <OrbitRing
          key={`ring-${p.id}`}
          radius={p.a}
          color={p.a < 2 ? "#475569" : p.a < 10 ? "#334155" : "#1e293b"}
          opacity={p.a < 5 ? 0.32 : 0.2}
        />
      ))}

      {PLANETS.map((p) => (
        <BodyMesh
          key={p.id}
          bodyId={p.id}
          simMs={simMs}
          showLabel={p.id !== "sun"}
        />
      ))}

      {moons.map((m) => (
        <BodyMesh
          key={m.id}
          bodyId={m.id}
          simMs={simMs}
          showLabel
          scale={focus === m.parentId || focus === m.id ? 1.15 : 0.9}
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

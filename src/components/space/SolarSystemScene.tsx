"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MOONS, PLANETS, type BodyId, getBody, bodyPositionAU } from "@/lib/bodies";
import { craftScenePosition, type OrbitElements } from "@/lib/orbital";
import type { LiveCraftMarker } from "@/lib/types";
import { getSkin } from "@/lib/cosmetics";
import {
  AsteroidRocks,
  AtmosphereShell,
  BeltGuideRing,
  DeepStarfield,
  EclipticDust,
  GasGiantSheen,
  ParticleCloud,
  SunGlow,
} from "./SpaceEnvironment";
import { EarthGlobe, preloadEarthTextures } from "./EarthGlobe";

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
  earthBoost = false,
}: {
  bodyId: BodyId;
  simMs: number;
  showLabel: boolean;
  scale?: number;
  /** Slightly larger Earth when camera is close (Google Earth framing) */
  earthBoost?: boolean;
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

  if (def.id === "earth") {
    const sun = bodyPositionAU("sun", simMs);
    const er = r * (earthBoost ? 1.35 : 1);
    return (
      <EarthGlobe
        radius={er}
        position={[pos.x, pos.y, pos.z]}
        sunPosition={[sun.x, sun.y, sun.z]}
        showLabel={showLabel}
        simMs={simMs}
      />
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

function isEarthCloseFocus(
  focus: SolarSystemSceneProps["focus"],
  craftOrbit?: OrbitElements | null
): boolean {
  if (focus === "earth" || focus === "moon") return true;
  if (focus === "craft" && craftOrbit?.centralBody === "earth") return true;
  return false;
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
  const { camera } = useThree();
  const earthClose = isEarthCloseFocus(focus, craftOrbit);

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

    // Google Earth–style framing: pull in when Earth / LEO / Moon
    if (earthClose) {
      c.minDistance = 0.045;
      c.maxDistance = 1.2;
      c.maxPolarAngle = Math.PI * 0.88;
      const offset = camera.position.clone().sub(c.target as THREE.Vector3);
      const dist = offset.length();
      const desired =
        focus === "earth" ? 0.11 : focus === "moon" ? 0.09 : 0.14;
      if (dist > desired * 2.2 || dist < 0.02) {
        const next = THREE.MathUtils.lerp(dist, desired, 0.06);
        if (offset.lengthSq() < 1e-8) {
          offset.set(0.08, 0.05, 0.1);
        }
        offset.setLength(Math.max(next, c.minDistance));
        camera.position.copy(c.target as THREE.Vector3).add(offset);
      }
    } else {
      c.minDistance = 0.08;
      c.maxDistance = 90;
      c.maxPolarAngle = Math.PI * 0.92;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={earthClose ? 0.1 : 0.08}
      minDistance={earthClose ? 0.045 : 0.08}
      maxDistance={earthClose ? 1.2 : 90}
      maxPolarAngle={Math.PI * 0.92}
      rotateSpeed={earthClose ? 0.55 : 0.8}
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
  const earthClose = isEarthCloseFocus(focus, craftOrbit);

  useEffect(() => {
    preloadEarthTextures();
  }, []);

  return (
    <>
      <color attach="background" args={["#01040f"]} />
      <fog attach="fog" args={["#01040f", 35, 95]} />
      {/* Dimmer ambient so Earth day/night terminator reads */}
      <ambientLight intensity={earthClose ? 0.04 : 0.08} />
      <hemisphereLight
        args={["#1e293b", "#020617", earthClose ? 0.2 : 0.35]}
      />

      <DeepStarfield />
      <EclipticDust />

      {/* ASTEROID BELT — deliberately bold so you notice it */}
      <ParticleCloud
        count={5000}
        rMin={2.0}
        rMax={3.4}
        ySpread={0.1}
        size={0.045}
        color="#f5e6c8"
        opacity={0.9}
        seed={11}
      />
      <AsteroidRocks count={1200} rMin={2.05} rMax={3.35} seed={99} />
      <BeltGuideRing />

      {/* Inner dust */}
      <ParticleCloud
        count={1200}
        rMin={0.5}
        rMax={1.8}
        ySpread={0.04}
        size={0.03}
        color="#fff1d6"
        opacity={0.35}
        seed={55}
      />
      {/* Trojans near Jupiter */}
      <ParticleCloud
        count={800}
        rMin={4.8}
        rMax={5.5}
        ySpread={0.08}
        size={0.03}
        color="#e7d3b0"
        opacity={0.5}
        seed={33}
      />
      {/* Outer Kuiper — bigger points so visible at system scale */}
      <ParticleCloud
        count={2500}
        rMin={30}
        rMax={50}
        ySpread={0.15}
        size={0.12}
        color="#cbd5e1"
        opacity={0.5}
        seed={44}
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
          earthBoost={earthClose && p.id === "earth"}
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

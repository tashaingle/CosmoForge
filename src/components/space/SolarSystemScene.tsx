"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MOONS, PLANETS, type BodyId, getBody, bodyPositionAU } from "@/lib/bodies";
import { craftScenePosition, type OrbitElements } from "@/lib/orbital";
import type { LiveCraftMarker } from "@/lib/types";
import { getSkin } from "@/lib/cosmetics";
import {
  DeepStarfield,
  EclipticDust,
  MainAsteroidBelt,
  ParticleCloud,
} from "./SpaceEnvironment";
import { EarthGlobe, preloadEarthTextures } from "./EarthGlobe";
import {
  TexturedCelestial,
  preloadBodyTextures,
} from "./TexturedCelestial";
import {
  allBodyTextureUrls,
  getBodyVisual,
} from "@/lib/body-visuals";
import { BodyLabel } from "./BodyLabel";

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
  closeBoost = false,
}: {
  bodyId: BodyId;
  simMs: number;
  showLabel: boolean;
  scale?: number;
  /** Slightly larger when camera is focused on this body */
  closeBoost?: boolean;
}) {
  const def = getBody(bodyId)!;
  const pos = bodyPositionAU(bodyId, simMs);
  const r = def.visualRadius * scale * (closeBoost ? 1.35 : 1);
  const sun = bodyPositionAU("sun", simMs);
  const sunPos: [number, number, number] = [sun.x, sun.y, sun.z];
  const position: [number, number, number] = [pos.x, pos.y, pos.z];

  const labelVariant =
    def.id === "sun" ? "sun" : def.kind === "moon" ? "moon" : "planet";

  // Earth keeps the full day/night/clouds treatment
  if (def.id === "earth") {
    return (
      <group position={position}>
        <EarthGlobe
          radius={r}
          position={[0, 0, 0]}
          sunPosition={[
            sunPos[0] - position[0],
            sunPos[1] - position[1],
            sunPos[2] - position[2],
          ]}
          showLabel={false}
          simMs={simMs}
        />
        {showLabel && (
          <BodyLabel name={def.name} radius={r} variant="planet" />
        )}
      </group>
    );
  }

  const visual = getBodyVisual(bodyId);
  if (visual?.map) {
    return (
      <group position={position}>
        <TexturedCelestial
          radius={r}
          position={[0, 0, 0]}
          sunPosition={[
            sunPos[0] - position[0],
            sunPos[1] - position[1],
            sunPos[2] - position[2],
          ]}
          visual={visual}
          label={def.name}
          showLabel={false}
          simMs={simMs}
          segments={
            def.kind === "moon" ? 48 : def.id === "sun" ? 48 : 72
          }
        />
        {showLabel && (
          <BodyLabel
            name={def.name}
            radius={r}
            variant={labelVariant}
          />
        )}
      </group>
    );
  }

  // Fallback solid (shouldn't hit for catalog bodies)
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[r, 36, 36]} />
        <meshStandardMaterial
          color={def.color}
          emissive={def.color}
          emissiveIntensity={0.08}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      {showLabel && (
        <BodyLabel name={def.name} radius={r} variant={labelVariant} />
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
  showLabel = true,
}: {
  orbit: OrbitElements;
  simMs: number;
  name: string;
  subtitle?: string;
  color?: string;
  size?: number;
  showTrail?: boolean;
  showLabel?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Vector3[]>([]);
  const { camera } = useThree();
  const [labelOn, setLabelOn] = useState(true);

  useFrame(() => {
    if (!ref.current) return;
    const p = craftScenePosition(orbit, simMs);
    ref.current.position.set(p.x, p.y, p.z);
    if (showTrail) {
      trail.current.push(new THREE.Vector3(p.x, p.y, p.z));
      if (trail.current.length > 70) trail.current.shift();
    }
    if (showLabel) {
      const dist = camera.position.distanceTo(
        new THREE.Vector3(p.x, p.y, p.z)
      );
      // Only label when not hugging the craft / planet
      setLabelOn(dist > 0.2 && dist < 12);
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
        {showLabel && labelOn && (
          <Html
            center
            distanceFactor={10}
            position={[0, size * 3.5, 0]}
            style={{ pointerEvents: "none" }}
            zIndexRange={[8, 0]}
          >
            <div
              className="max-w-[120px] select-none truncate whitespace-nowrap rounded-md border bg-slate-950/50 px-1.5 py-0.5 text-[9px] backdrop-blur-[2px]"
              style={{
                borderColor: `${color}44`,
                color: "#e2e8f0",
              }}
            >
              {name}
              {subtitle ? (
                <span className="block text-[8px] opacity-60">{subtitle}</span>
              ) : null}
            </div>
          </Html>
        )}
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

function isBodyCloseFocus(
  focus: SolarSystemSceneProps["focus"],
  craftOrbit?: OrbitElements | null
): boolean {
  if (focus === "system") return false;
  if (focus === "craft") {
    return craftOrbit?.centralBody === "earth";
  }
  return true; // any planet/moon focus
}

function desiredCloseDistance(
  focus: SolarSystemSceneProps["focus"],
  craftOrbit?: OrbitElements | null
): number {
  if (focus === "craft" && craftOrbit?.centralBody === "earth") return 0.14;
  if (focus === "earth" || focus === "moon") return 0.11;
  if (focus === "mars" || focus === "venus" || focus === "mercury") return 0.1;
  if (focus === "jupiter" || focus === "saturn") return 0.22;
  if (focus === "uranus" || focus === "neptune") return 0.16;
  if (typeof focus === "string" && focus !== "system" && focus !== "craft") {
    const b = getBody(focus);
    if (b?.kind === "moon") return 0.08;
    if (b?.kind === "dwarf") return 0.09;
  }
  return 0.14;
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
  const bodyClose = isBodyCloseFocus(focus, craftOrbit);

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

    // Close framing for planet/moon inspection (Google Earth–style)
    if (bodyClose) {
      c.minDistance = 0.04;
      c.maxDistance = 3.5;
      c.maxPolarAngle = Math.PI * 0.9;
      const offset = camera.position.clone().sub(c.target as THREE.Vector3);
      const dist = offset.length();
      const desired = desiredCloseDistance(focus, craftOrbit);
      if (dist > desired * 2.5 || dist < 0.02) {
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
      dampingFactor={bodyClose ? 0.1 : 0.08}
      minDistance={bodyClose ? 0.04 : 0.08}
      maxDistance={bodyClose ? 3.5 : 90}
      maxPolarAngle={Math.PI * 0.92}
      rotateSpeed={bodyClose ? 0.55 : 0.8}
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
  const bodyClose = isBodyCloseFocus(focus, craftOrbit);
  const focusBodyId =
    focus !== "system" && focus !== "craft" ? focus : null;

  useEffect(() => {
    preloadEarthTextures();
    preloadBodyTextures(allBodyTextureUrls());
  }, []);

  return (
    <>
      <color attach="background" args={["#01040f"]} />
      <fog attach="fog" args={["#01040f", 35, 95]} />
      {/* Dimmer ambient so textured day/night terminators read */}
      <ambientLight intensity={bodyClose ? 0.04 : 0.08} />
      <hemisphereLight
        args={["#1e293b", "#020617", bodyClose ? 0.2 : 0.35]}
      />

      <DeepStarfield />
      {/* Hide clutter when inspecting a planet up close */}
      {!bodyClose && <EclipticDust />}

      {/* Main asteroid belt (between Mars ~1.5 AU and Jupiter ~5 AU) */}
      <MainAsteroidBelt visible={!bodyClose || focusBodyId === "ceres"} />

      {/* Zodiacal / inner dust — very subtle */}
      {!bodyClose && (
        <ParticleCloud
          count={800}
          rMin={0.55}
          rMax={1.7}
          ySpread={0.03}
          size={0.014}
          color="#6b7280"
          opacity={0.22}
          seed={55}
        />
      )}
      {/* Jupiter Trojans — gray dust clumps ahead/behind Jupiter's orbit */}
      {!bodyClose && (
        <ParticleCloud
          count={600}
          rMin={4.9}
          rMax={5.4}
          ySpread={0.05}
          size={0.016}
          color="#6b6560"
          opacity={0.32}
          seed={33}
        />
      )}
      {/* Kuiper belt — soft distant haze, not big white squares */}
      {!bodyClose && (
        <ParticleCloud
          count={1600}
          rMin={32}
          rMax={48}
          ySpread={0.2}
          size={0.06}
          color="#94a3b8"
          opacity={0.28}
          seed={44}
        />
      )}

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
          // Overview only — hide when inspecting a world so textures stay clear
          showLabel={focus === "system" && p.id !== "sun"}
          closeBoost={bodyClose && focusBodyId === p.id}
        />
      ))}

      {moons.map((m) => (
        <BodyMesh
          key={m.id}
          bodyId={m.id}
          simMs={simMs}
          // Moon tags only when looking at the parent planet (not on top of the moon itself)
          showLabel={
            focus === m.parentId && focusBodyId !== m.id
          }
          scale={focus === m.parentId || focus === m.id ? 1.15 : 0.9}
          closeBoost={focusBodyId === m.id}
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
          showLabel={focus === "system" || focus === "craft"}
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
            showLabel={focus === "system" || focus === "craft"}
          />
        </>
      )}

      <CameraRig focus={focus} simMs={simMs} craftOrbit={craftOrbit} />
    </>
  );
}

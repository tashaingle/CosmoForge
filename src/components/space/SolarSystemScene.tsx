"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
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
import { CraftModel } from "./CraftModel";

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
  scale = 1,
  closeBoost = false,
}: {
  bodyId: BodyId;
  simMs: number;
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
    </group>
  );
}

function CraftMarker({
  orbit,
  simMs,
  color = "#22d3ee",
  showTrail = true,
  isPlayer = false,
}: {
  orbit: OrbitElements;
  simMs: number;
  name?: string;
  subtitle?: string;
  color?: string;
  size?: number;
  showTrail?: boolean;
  showLabel?: boolean;
  isPlayer?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Vector3[]>([]);

  useFrame(() => {
    if (!ref.current) return;
    const p = craftScenePosition(orbit, simMs);
    ref.current.position.set(p.x, p.y, p.z);
    if (showTrail) {
      trail.current.push(new THREE.Vector3(p.x, p.y, p.z));
      if (trail.current.length > 90) trail.current.shift();
    }
  });

  const trailPoints =
    trail.current.length > 1 ? trail.current : [new THREE.Vector3()];

  return (
    <>
      <group ref={ref}>
        <CraftModel color={color} baseSize={isPlayer ? 0.014 : 0.01} />
      </group>
      {showTrail && trail.current.length > 2 && (
        <Line
          points={trailPoints}
          color={color}
          lineWidth={isPlayer ? 1.5 : 1}
          transparent
          opacity={isPlayer ? 0.55 : 0.3}
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
  // Wide enough that user can immediately zoom out; not a locked close-up
  if (focus === "craft") {
    return craftOrbit?.centralBody === "earth" ? 0.28 : 0.55;
  }
  if (focus === "earth" || focus === "moon") return 0.22;
  if (focus === "mars" || focus === "venus" || focus === "mercury") return 0.2;
  if (focus === "jupiter" || focus === "saturn") return 0.45;
  if (focus === "uranus" || focus === "neptune") return 0.35;
  // Remaining BodyId focuses (other moons / dwarfs)
  if (focus !== "system") {
    const b = getBody(focus as BodyId);
    if (b?.kind === "moon") return 0.16;
    if (b?.kind === "dwarf") return 0.18;
  }
  return 0.3;
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
  const prevFocus = useRef(focus);
  /** Auto-frame only when focus changes — then full free orbit/zoom */
  const frameFrames = useRef(focus === "system" ? 0 : 28);
  const tmpOffset = useRef(new THREE.Vector3());
  const tmpTarget = useRef(new THREE.Vector3());
  const userZooming = useRef(false);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;

    c.minDistance = 0.02;
    c.maxDistance = 120;
    c.maxPolarAngle = Math.PI * 0.95;

    if (prevFocus.current !== focus) {
      prevFocus.current = focus;
      userZooming.current = false;
      frameFrames.current = focus === "system" ? 0 : 28;
    }

    // Free look: do not touch camera or target
    if (focus === "system") {
      return;
    }

    if (focus === "craft" && craftOrbit) {
      const p = craftScenePosition(craftOrbit, simMs);
      tmpTarget.current.set(p.x, p.y, p.z);
    } else if (focus !== "craft") {
      const p = bodyPositionAU(focus, simMs);
      tmpTarget.current.set(p.x, p.y, p.z);
    } else {
      return;
    }

    // Keep pivot on target so drag orbits the craft/body (not free-float)
    c.target.lerp(tmpTarget.current, 0.15);

    // Brief open shot only — stop if user already scrolled/dragged
    if (frameFrames.current > 0 && !userZooming.current) {
      frameFrames.current -= 1;
      const desired = desiredCloseDistance(focus, craftOrbit);
      const offset = tmpOffset.current
        .copy(camera.position)
        .sub(c.target as THREE.Vector3);
      if (offset.lengthSq() < 1e-8) offset.set(0.12, 0.08, 0.18);
      const next = THREE.MathUtils.lerp(offset.length(), desired, 0.18);
      offset.setLength(Math.max(next, c.minDistance));
      camera.position.copy(c.target as THREE.Vector3).add(offset);
      c.update?.();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.02}
      maxDistance={120}
      maxPolarAngle={Math.PI * 0.95}
      rotateSpeed={0.8}
      zoomSpeed={1.1}
      enablePan
      enableZoom
      enableRotate
      onStart={() => {
        // Any user input cancels auto-frame so zoom-out always works
        userZooming.current = true;
        frameFrames.current = 0;
      }}
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
          closeBoost={bodyClose && focusBodyId === p.id}
        />
      ))}

      {moons.map((m) => (
        <BodyMesh
          key={m.id}
          bodyId={m.id}
          simMs={simMs}
          scale={focus === m.parentId || focus === m.id ? 1.15 : 0.9}
          closeBoost={focusBodyId === m.id}
        />
      ))}

      {otherCrafts.map((oc, i) => (
        <CraftMarker
          key={oc.id}
          orbit={oc.orbit}
          simMs={simMs}
          color={
            oc.skinId
              ? getSkin(oc.skinId).color
              : OTHER_COLORS[i % OTHER_COLORS.length]
          }
          showTrail={false}
          isPlayer={false}
        />
      ))}

      {craftOrbit && (
        <>
          <CraftOrbitPreview orbit={craftOrbit} simMs={simMs} />
          <CraftMarker
            orbit={craftOrbit}
            simMs={simMs}
            color={playerColor}
            showTrail
            isPlayer
          />
        </>
      )}

      <CameraRig focus={focus} simMs={simMs} craftOrbit={craftOrbit} />
    </>
  );
}

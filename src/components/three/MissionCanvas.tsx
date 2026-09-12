"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MathUtils, type Group } from "three";
import type { Craft } from "@/lib/types";
import { getMissionEnvironment, MODEL_PATHS, type MissionEnvironment } from "@/lib/3d-assets";
import type { ThreeQuality } from "./three-quality";
import { ProbeModel } from "./ProbeModel";
import { SceneCamera } from "./SceneCamera";

const MISSION_TARGET: [number, number, number] = [0.4, 1.1, 0.1];

const ENVIRONMENT_ROOTS: Record<MissionEnvironment, string> = {
  earth: "Planet_Earth", moon: "Planet_Moon", mars: "Planet_Mars",
  venus: "Planet_Venus", asteroids: "AsteroidField_Demo",
  "deep-space": "Space_DistantDust", cursed: "Space_CursedDistortion",
};

const ROOT_NAMES = [
  "Planet_Earth", "Planet_Moon", "Moon_CraterForeground", "Planet_Mars",
  "Mars_Rock_A", "Mars_Rock_B", "Mars_Ridge", "Mars_DustCloud", "Planet_Venus",
  "Star_Sun", "Asteroid_A", "Asteroid_B", "Asteroid_C", "Asteroid_D", "Asteroid_E",
  "Asteroid_Fragment_Small", "AsteroidField_Demo", "CF_Starfield", "Space_Nebula_Volume",
  "Space_DistantDust", "Space_UnknownGlow", "Space_CursedDistortion", "Space_ImpossibleStar",
  "Orbit_Path", "Mission_TargetMarker", "Signal_Ping", "Navigation_Beacon", "Unknown_SignalMarker",
];

function show(root: Group, name: string, visible: boolean) {
  root.getObjectByName(name)?.traverse((object) => { object.visible = visible; });
}

function Environment({ craft, progress, quality, reducedMotion }: { craft: Craft; progress: number; quality: ThreeQuality; reducedMotion: boolean }) {
  const source = useGLTF(MODEL_PATHS.space);
  const scene = useMemo(() => source.scene.clone(true), [source.scene]);
  const holder = useRef<Group>(null);
  const destination = getMissionEnvironment(craft.missionId);
  const latestEncounter = [...(craft.pings ?? [])].reverse().find((ping) => ping.encounterId)?.encounterId ?? "";

  useEffect(() => {
    for (const name of ROOT_NAMES) show(scene, name, false);
    show(scene, "CF_Starfield", true);
    show(scene, ENVIRONMENT_ROOTS[destination], true);
    if (destination === "earth") show(scene, "Planet_Earth", true);
    if (latestEncounter.includes("extra_star")) show(scene, "Space_ImpossibleStar", true);
    if (latestEncounter.includes("radio") || latestEncounter.includes("signal")) show(scene, "Signal_Ping", true);
    if (latestEncounter.includes("knock") || latestEncounter.includes("cursed")) show(scene, "Space_CursedDistortion", true);
    if (quality === "low") {
      for (const name of ["Earth_Atmosphere", "Venus_Atmosphere", "Mars_DustCloud", "Space_Nebula_Volume", "Space_DistantDust"]) show(scene, name, false);
    }
    const destinationObject = scene.getObjectByName(ENVIRONMENT_ROOTS[destination]);
    if (destinationObject) {
      const distance = MathUtils.lerp(7.2, 3.9, Math.min(1, Math.max(0, progress)));
      destinationObject.position.set(4.4, 0.1, -distance);
      const scale = destination === "asteroids" ? 0.42 : MathUtils.lerp(0.62, 0.92, progress);
      destinationObject.scale.setScalar(scale);
    }
    const impossible = scene.getObjectByName("Space_ImpossibleStar");
    impossible?.position.set(-2.4, 2.2, -5);
    const ping = scene.getObjectByName("Signal_Ping");
    ping?.position.set(2.3, 1.1, -2);
    const cursed = scene.getObjectByName("Space_CursedDistortion");
    if (cursed && destination !== "cursed") cursed.position.set(3.3, 0.4, -3.5);
  }, [destination, latestEncounter, progress, quality, scene]);

  useFrame((_, delta) => {
    if (reducedMotion || !holder.current) return;
    const destinationObject = scene.getObjectByName(ENVIRONMENT_ROOTS[destination]);
    if (destinationObject) destinationObject.rotation.z += delta * 0.018;
    scene.getObjectByName("Earth_Clouds")?.rotateZ(delta * 0.014);
    scene.getObjectByName("Venus_CloudLayer_01")?.rotateZ(delta * 0.018);
    scene.getObjectByName("Venus_CloudLayer_02")?.rotateZ(-delta * 0.011);
  });
  return <group ref={holder}><primitive object={scene} /></group>;
}

export default function MissionCanvas({ craft, progress, quality, reducedMotion }: { craft: Craft; progress: number; quality: ThreeQuality; reducedMotion: boolean }) {
  const environment = getMissionEnvironment(craft.missionId);
  const rim = environment === "mars" ? "#fb5c2b" : environment === "venus" ? "#fbbf24" : environment === "cursed" ? "#d946ef" : "#67e8f9";
  return <Canvas dpr={quality === "high" ? [1, 1.5] : 1} frameloop={reducedMotion ? "demand" : "always"} camera={{ position: [7.6, 4.2, 12], fov: 44 }} gl={{ antialias: quality === "high", powerPreference: "high-performance" }}>
    <SceneCamera target={MISSION_TARGET} />
    <ambientLight intensity={0.24} />
    <directionalLight position={[-5, -6, 8]} intensity={2.2} color="#effaff" />
    <pointLight position={[3, 1, 4]} intensity={quality === "high" ? 24 : 12} distance={14} color={rim} />
    <Environment craft={craft} progress={progress} quality={quality} reducedMotion={reducedMotion} />
    <group position={[-1.35, 0.2, 0]} scale={0.78}><ProbeModel craft={craft} reducedMotion={reducedMotion} /></group>
  </Canvas>;
}

useGLTF.preload(MODEL_PATHS.space);

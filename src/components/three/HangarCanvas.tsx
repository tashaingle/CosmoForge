"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MathUtils } from "three";
import type { Craft } from "@/lib/types";
import { HANGAR_CLAMP_NODES, HANGAR_DOOR_NODES, HANGAR_LOW_QUALITY_HIDE, MODEL_PATHS } from "@/lib/3d-assets";
import type { ThreeQuality } from "./three-quality";
import { ProbeModel } from "./ProbeModel";
import { SceneCamera } from "./SceneCamera";

const HANGAR_TARGET: [number, number, number] = [0, 0.25, -0.25];

type HangarPhase = "onboarding" | "inspect" | "launch" | "return";

function Hangar({ phase, stage, quality, reducedMotion }: { phase: HangarPhase; stage: number; quality: ThreeQuality; reducedMotion: boolean }) {
  const source = useGLTF(MODEL_PATHS.hangar);
  const scene = useMemo(() => source.scene.clone(true), [source.scene]);
  useEffect(() => {
    scene.traverse((object) => { object.visible = quality === "high" || !HANGAR_LOW_QUALITY_HIDE.test(object.name); });
  }, [quality, scene]);
  useFrame((_, delta) => {
    const opening = phase === "launch" ? Math.max(0, stage - 1) / 3 : phase === "return" ? Math.max(0, 3 - stage) / 3 : 0;
    const left = scene.getObjectByName(HANGAR_DOOR_NODES[0]);
    const right = scene.getObjectByName(HANGAR_DOOR_NODES[1]);
    const leftX = -2.3 * opening;
    const rightX = 2.3 * opening;
    if (left) left.position.x = reducedMotion ? leftX : MathUtils.damp(left.position.x, leftX, 4, delta);
    if (right) right.position.x = reducedMotion ? rightX : MathUtils.damp(right.position.x, rightX, 4, delta);
    HANGAR_CLAMP_NODES.forEach((name, index) => {
      const clamp = scene.getObjectByName(name);
      const angle = opening * (index === 0 ? -1 : 1) * 0.8;
      if (clamp) clamp.rotation.y = reducedMotion ? angle : MathUtils.damp(clamp.rotation.y, angle, 5, delta);
    });
  });
  return <primitive object={scene} scale={0.72} />;
}

export default function HangarCanvas({ craft, quality, reducedMotion, phase, stage = 0, reaction = null }: { craft: Craft; quality: ThreeQuality; reducedMotion: boolean; phase: HangarPhase; stage?: number; reaction?: "anxious" | "dramatic" | "chaotic" | null }) {
  const launching = phase === "launch" && stage >= 3;
  const probeZ = launching ? -Math.max(0, stage - 2) * 1.1 : phase === "return" ? -Math.max(0, 3 - stage) * 1.1 : 0;
  return <Canvas dpr={quality === "high" ? [1, 1.45] : 1} frameloop={reducedMotion ? "demand" : "always"} shadows={quality === "high"} camera={{ position: [6.05, 4.05, 7.55], fov: 43 }} gl={{ antialias: quality === "high", powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.toneMappingExposure = 0.68; }}>
    <SceneCamera target={HANGAR_TARGET} />
    <ambientLight intensity={phase === "onboarding" ? 0.12 : 0.22} />
    <directionalLight position={[-4, 6, 8]} intensity={phase === "onboarding" ? 0.42 : 0.72} color="#f5fbff" castShadow={quality === "high"} />
    <pointLight position={[0, 2, 1]} intensity={0.7} distance={9} color="#22d3ee" />
    {launching && <pointLight position={[0, 2, -0.5]} intensity={34} distance={8} color="#67e8f9" />}
    <Hangar phase={phase} stage={stage} quality={quality} reducedMotion={reducedMotion} />
    <group position={[0, 0, probeZ]} scale={0.72}><ProbeModel craft={craft} reducedMotion={reducedMotion} launching={launching} reaction={reaction} /></group>
  </Canvas>;
}

useGLTF.preload(MODEL_PATHS.hangar);

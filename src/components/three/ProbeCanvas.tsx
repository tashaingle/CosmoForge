"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import type { Craft } from "@/lib/types";
import type { ThreeQuality } from "./three-quality";
import { ProbeModel } from "./ProbeModel";
import { SceneCamera } from "./SceneCamera";

const PROBE_TARGET: [number, number, number] = [0, 0, 0];

export default function ProbeCanvas({ craft, quality, reducedMotion, launching = false, reaction = null }: { craft: Craft; quality: ThreeQuality; reducedMotion: boolean; launching?: boolean; reaction?: "anxious" | "dramatic" | "chaotic" | null }) {
  return <Canvas dpr={quality === "high" ? [1, 1.6] : 1} frameloop={reducedMotion ? "demand" : "always"} camera={{ position: [4.8, 3.3, 7.5], fov: 36 }} gl={{ antialias: quality === "high", powerPreference: "high-performance" }}>
    <SceneCamera target={PROBE_TARGET} />
    <ambientLight intensity={0.55} />
    <directionalLight position={[-4, -5, 7]} intensity={2.5} color="#dff8ff" />
    <pointLight position={[4, 2, 3]} intensity={18} color="#22d3ee" distance={12} />
    <ProbeModel craft={craft} reducedMotion={reducedMotion} launching={launching} reaction={reaction} />
    {quality === "high" && <ContactShadows position={[0, -1.25, 0]} opacity={0.25} scale={7} blur={2.5} far={4} />}
  </Canvas>;
}

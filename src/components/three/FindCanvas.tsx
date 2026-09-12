"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";
import type { LootId, LootRarity } from "@/lib/probe-loot";
import { findModelPath } from "@/lib/3d-assets";
import type { ThreeQuality } from "./three-quality";
import { SceneCamera } from "./SceneCamera";

const FIND_TARGET: [number, number, number] = [0, 0, 0];

function FindModel({ lootId, reducedMotion }: { lootId: LootId; reducedMotion: boolean }) {
  const path = findModelPath(lootId)!;
  const source = useGLTF(path);
  const object = useMemo(() => source.scene.clone(true), [source.scene]);
  const holder = useRef<Group>(null);
  useFrame((state, delta) => {
    if (!holder.current || reducedMotion) return;
    holder.current.rotation.y += delta * 0.28;
    holder.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.07;
  });
  return <group ref={holder} scale={1.35}><primitive object={object} /></group>;
}

export default function FindCanvas({ lootId, rarity, quality, reducedMotion }: { lootId: LootId; rarity: LootRarity; quality: ThreeQuality; reducedMotion: boolean }) {
  const accent = rarity === "cursed" ? "#d946ef" : rarity === "rare" ? "#a78bfa" : rarity === "uncommon" ? "#fbbf24" : "#67e8f9";
  return <Canvas dpr={quality === "high" ? [1, 1.5] : 1} frameloop={reducedMotion ? "demand" : "always"} camera={{ position: [3.7, 2.8, 6.2], fov: 40 }} gl={{ antialias: quality === "high", powerPreference: "high-performance" }}>
    <SceneCamera target={FIND_TARGET} />
    <ambientLight intensity={0.65} />
    <directionalLight position={[-4, -4, 6]} intensity={2.4} />
    <pointLight position={[2, -1, 3]} intensity={rarity === "cursed" ? 24 : 15} distance={9} color={accent} />
    <FindModel lootId={lootId} reducedMotion={reducedMotion} />
  </Canvas>;
}

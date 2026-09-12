"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { LootId, LootRarity } from "@/lib/probe-loot";
import { findModelPath, type FindPresentation } from "@/lib/3d-assets";
import { ThreeLoading, ThreeSceneFallback } from "./ThreeSceneFallback";
import { useThreeCapability } from "./three-quality";

const FindCanvas = dynamic(() => import("./FindCanvas"), { ssr: false, loading: () => <ThreeLoading label="Retrieving a recovered object…" /> });

export function Find3D({ lootId, rarity, fallback, className = "", presentation = "cargo" }: { lootId: LootId; rarity: LootRarity; fallback: ReactNode; className?: string; presentation?: FindPresentation }) {
  const capability = useThreeCapability();
  if (!capability.checked || !capability.enabled || !findModelPath(lootId)) return fallback;
  return <div className={`three-stage three-find-stage ${className}`}><ThreeSceneFallback fallback={fallback}><FindCanvas lootId={lootId} rarity={rarity} quality={capability.quality} reducedMotion={capability.reducedMotion} presentation={presentation} /></ThreeSceneFallback></div>;
}

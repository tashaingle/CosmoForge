"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { LootId, LootRarity } from "@/lib/probe-loot";
import { findModelPath } from "@/lib/3d-assets";
import { ThreeLoading, ThreeSceneFallback } from "./ThreeSceneFallback";
import { useThreeCapability } from "./three-quality";

const FindCanvas = dynamic(() => import("./FindCanvas"), { ssr: false, loading: () => <ThreeLoading label="Opening a suspicious cargo case…" /> });

export function Find3D({ lootId, rarity, fallback, className = "" }: { lootId: LootId; rarity: LootRarity; fallback: ReactNode; className?: string }) {
  const capability = useThreeCapability();
  if (!capability.checked || !capability.enabled || !findModelPath(lootId)) return fallback;
  return <div className={`three-stage three-find-stage ${className}`}><ThreeSceneFallback fallback={fallback}><FindCanvas lootId={lootId} rarity={rarity} quality={capability.quality} reducedMotion={capability.reducedMotion} /></ThreeSceneFallback></div>;
}

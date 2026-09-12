"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { Craft } from "@/lib/types";
import { ThreeLoading, ThreeSceneFallback } from "./ThreeSceneFallback";
import { useThreeCapability } from "./three-quality";

const ProbeCanvas = dynamic(() => import("./ProbeCanvas"), { ssr: false, loading: () => <ThreeLoading /> });

export function Probe3D({ craft, fallback, className = "", launching = false, reaction = null }: { craft: Craft; fallback: ReactNode; className?: string; launching?: boolean; reaction?: "anxious" | "dramatic" | "chaotic" | null }) {
  const capability = useThreeCapability();
  if (!capability.checked || !capability.enabled) return fallback;
  return <div className={`three-stage ${className}`} aria-label={`3D view of ${craft.name}`}>
    <ThreeSceneFallback fallback={fallback}><ProbeCanvas craft={craft} quality={capability.quality} reducedMotion={capability.reducedMotion} launching={launching} reaction={reaction} /></ThreeSceneFallback>
  </div>;
}

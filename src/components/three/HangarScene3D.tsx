"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { Craft } from "@/lib/types";
import { ThreeLoading, ThreeSceneFallback } from "./ThreeSceneFallback";
import { useThreeCapability } from "./three-quality";

const HangarCanvas = dynamic(() => import("./HangarCanvas"), { ssr: false, loading: () => <ThreeLoading label="Pressurising Hangar 3…" /> });

export function HangarScene3D({ craft, fallback, phase = "inspect", stage = 0, reaction = null, className = "" }: { craft: Craft; fallback: ReactNode; phase?: "onboarding" | "inspect" | "launch" | "return"; stage?: number; reaction?: "anxious" | "dramatic" | "chaotic" | null; className?: string }) {
  const capability = useThreeCapability();
  if (!capability.checked || !capability.enabled) return fallback;
  return <div className={`three-stage three-hangar-stage ${className}`}><ThreeSceneFallback fallback={fallback}><HangarCanvas craft={craft} quality={capability.quality} reducedMotion={capability.reducedMotion} phase={phase} stage={stage} reaction={reaction} /></ThreeSceneFallback></div>;
}


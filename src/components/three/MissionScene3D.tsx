"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { Craft } from "@/lib/types";
import { ThreeLoading, ThreeSceneFallback } from "./ThreeSceneFallback";
import { useThreeCapability } from "./three-quality";

const MissionCanvas = dynamic(() => import("./MissionCanvas"), { ssr: false, loading: () => <ThreeLoading label="Locating the correct planet…" /> });

export function MissionScene3D({ craft, progress, fallback }: { craft: Craft; progress: number; fallback: ReactNode }) {
  const capability = useThreeCapability();
  if (!capability.checked || !capability.enabled) return fallback;
  return <div className="three-stage three-mission-stage"><ThreeSceneFallback fallback={fallback}><MissionCanvas craft={craft} progress={progress} quality={capability.quality} reducedMotion={capability.reducedMotion} /></ThreeSceneFallback></div>;
}


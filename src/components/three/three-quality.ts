"use client";

import { useEffect, useState } from "react";

export type ThreeQuality = "high" | "low";
export type ThreePreference = ThreeQuality | "auto" | "2d";

const STORAGE_KEY = "cosmoforge-3d-settings-v1";
export const THREE_SETTINGS_EVENT = "cosmoforge:3d-settings";

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function automaticQuality(): ThreeQuality {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const modestCpu = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  return window.matchMedia("(max-width: 760px)").matches || modestCpu || (memory != null && memory <= 4) ? "low" : "high";
}

export function readThreePreference(): ThreePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { preference?: ThreePreference };
    return parsed.preference ?? "auto";
  } catch {
    return "auto";
  }
}

export function setThreePreference(preference: ThreePreference) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ preference }));
  window.dispatchEvent(new CustomEvent(THREE_SETTINGS_EVENT));
}

export function useThreeCapability() {
  const [state, setState] = useState({ enabled: false, quality: "low" as ThreeQuality, reducedMotion: true, checked: false });
  useEffect(() => {
    const update = () => {
      const preference = readThreePreference();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setState({
        enabled: preference !== "2d" && canUseWebGL(),
        quality: preference === "high" || preference === "low" ? preference : automaticQuality(),
        reducedMotion,
        checked: true,
      });
    };
    update();
    window.addEventListener(THREE_SETTINGS_EVENT, update);
    return () => window.removeEventListener(THREE_SETTINGS_EVENT, update);
  }, []);
  return state;
}


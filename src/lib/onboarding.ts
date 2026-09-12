import type { FleetState } from "./types";

const ONBOARDING_KEY = "cosmoforge-onboarding-v1";
const DEV_REPLAY_KEY = "cosmoforge-onboarding-dev-replay";

export type OnboardingSave = {
  version: 1;
  status: "in_progress" | "complete";
  craftId?: string;
};

export function loadOnboarding(): OnboardingSave | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? "null") as OnboardingSave | null;
    return value?.version === 1 ? value : null;
  } catch {
    return null;
  }
}

export function shouldShowOnboarding(fleet: FleetState): boolean {
  const save = loadOnboarding();
  if (save?.status === "complete") return false;
  if (save?.status === "in_progress") return true;
  return fleet.crafts.length === 0;
}

export function beginOnboarding(craftId?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ version: 1, status: "in_progress", craftId } satisfies OnboardingSave));
}

export function completeOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ version: 1, status: "complete" } satisfies OnboardingSave));
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_KEY);
}

export function beginDevelopmentReplay(): void {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ version: 1, status: "in_progress" } satisfies OnboardingSave));
  sessionStorage.setItem(DEV_REPLAY_KEY, "1");
}

export function isDevelopmentReplay(): boolean {
  return process.env.NODE_ENV === "development" && typeof window !== "undefined" && sessionStorage.getItem(DEV_REPLAY_KEY) === "1";
}

export function endDevelopmentReplay(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(DEV_REPLAY_KEY);
}

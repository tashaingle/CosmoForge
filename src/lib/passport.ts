import type { BodyId } from "./bodies";
import { PASSPORT_BODIES, getBody } from "./bodies";

const KEY = "cosmoforge-passport-v1";

export interface SolarPassport {
  version: 1;
  /** bodyId -> first discovery sim/wall time */
  discovered: Record<string, number>;
  updatedAt: number;
}

function empty(): SolarPassport {
  return { version: 1, discovered: {}, updatedAt: Date.now() };
}

export function loadPassport(): SolarPassport {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as SolarPassport;
    if (p?.version !== 1) return empty();
    return p;
  } catch {
    return empty();
  }
}

export function savePassport(p: SolarPassport): void {
  if (typeof window === "undefined") return;
  p.updatedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function discoverBody(
  bodyId: BodyId
): { passport: SolarPassport; isNew: boolean } {
  const p = loadPassport();
  if (p.discovered[bodyId]) {
    return { passport: p, isNew: false };
  }
  p.discovered[bodyId] = Date.now();
  savePassport(p);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { trackDailyStamp } = require("./daily") as {
      trackDailyStamp: () => void;
    };
    trackDailyStamp();
  } catch {
    /* ignore */
  }
  return { passport: p, isNew: true };
}

export function passportStats(p: SolarPassport = loadPassport()) {
  const total = PASSPORT_BODIES.length;
  const found = Object.keys(p.discovered).length;
  return {
    found,
    total,
    percent: Math.round((found / total) * 100),
    missing: PASSPORT_BODIES.filter((b) => !p.discovered[b.id]),
  };
}

export function discoveryRewardCredits(bodyId: BodyId): number {
  const b = getBody(bodyId);
  if (!b) return 20;
  switch (b.kind) {
    case "planet":
      return b.a > 10 ? 150 : b.a > 2 ? 100 : 60;
    case "dwarf":
      return 120;
    case "moon":
      return b.parentId === "earth" ? 50 : 90;
    default:
      return 30;
  }
}

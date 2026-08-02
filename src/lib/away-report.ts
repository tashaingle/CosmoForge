/**
 * Offline catch-up + “while you were away” report.
 * Core fantasy: your ship kept flying; something changed.
 */

import type { Craft } from "./types";
import {
  loadFleet,
  upsertCraft,
  type SyncContext,
} from "./storage";
import {
  craftScenePosition,
  formatDistanceAU,
  heliocentricDistanceAU,
  MISSION_PROFILES,
  periodDays,
  planetPositionAU,
} from "./orbital";
import {
  getMissionBriefing,
  loadObjectiveState,
  type ObjectiveContext,
} from "./mission-objectives";
import { getActiveSkyEvents } from "./sky-events";
import { bodyPositionAU, getBody, type BodyId } from "./bodies";

const LAST_HOME_KEY = "cosmoforge-last-home-ms";

export function getLastHomeVisitMs(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LAST_HOME_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function noteHomeVisit(): number {
  const now = Date.now();
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_HOME_KEY, String(now));
  }
  return now;
}

/** Real-time offline catch-up: craft sim advances while the app is closed. */
export function catchUpCraftOffline(craft: Craft): {
  craft: Craft;
  advancedMs: number;
} {
  if (craft.status !== "inflight" || !craft.orbit) {
    return { craft, advancedMs: 0 };
  }
  const last = craft.lastSimMs ?? craft.launchedAt ?? Date.now();
  const anchor = craft.updatedAt ?? last;
  const wallDelta = Math.max(0, Date.now() - anchor);
  // Cap at 30 real days so absurdly stale tabs don't explode UI copy
  const advancedMs = Math.min(wallDelta, 30 * 86400 * 1000);
  if (advancedMs < 1000) {
    return { craft, advancedMs: 0 };
  }
  const next: Craft = {
    ...craft,
    lastSimMs: last + advancedMs,
    updatedAt: Date.now(),
  };
  return { craft: next, advancedMs };
}

/** Catch up entire fleet and persist. Returns crafts that moved. */
export function catchUpFleetOffline(sync?: SyncContext): {
  crafts: Craft[];
  totalAdvancedMs: number;
} {
  const fleet = loadFleet();
  let totalAdvancedMs = 0;
  const updated: Craft[] = [];

  for (const c of fleet.crafts) {
    if (c.status !== "inflight") continue;
    const { craft, advancedMs } = catchUpCraftOffline(c);
    if (advancedMs > 0) {
      upsertCraft(craft, sync);
      updated.push(craft);
      totalAdvancedMs += advancedMs;
    } else {
      updated.push(c);
    }
  }

  // Re-load after writes so ids stay consistent
  const inflight = loadFleet().crafts.filter((c) => c.status === "inflight");
  return { crafts: inflight, totalAdvancedMs };
}

function formatDuration(ms: number): string {
  const h = ms / 3600000;
  if (h < 1) {
    const m = Math.max(1, Math.round(ms / 60000));
    return `${m}m`;
  }
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)}h`;
  const d = h / 24;
  return `${d.toFixed(d < 10 ? 1 : 0)}d`;
}

function nearestBodyName(craft: Craft, simMs: number): string | null {
  if (!craft.orbit) return null;
  const pos = craftScenePosition(craft.orbit, simMs);
  const candidates: BodyId[] = [
    "earth",
    "moon",
    "mars",
    "venus",
    "mercury",
    "jupiter",
    "saturn",
    "ceres",
  ];
  let best: { name: string; d: number } | null = null;
  for (const id of candidates) {
    const b = getBody(id);
    if (!b) continue;
    const bp =
      b.kind === "moon"
        ? bodyPositionAU(id, simMs)
        : planetPositionAU(id, simMs);
    const dx = pos.x - bp.x;
    const dy = pos.y - bp.y;
    const dz = pos.z - bp.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!best || d < best.d) best = { name: b.name, d };
  }
  return best?.name ?? null;
}

export interface AwayCraftLine {
  craftId: string;
  name: string;
  missionName: string;
  headline: string;
  detail: string;
  advancedMs: number;
  goalsDone: number;
  goalsTotal: number;
  nextTitle: string | null;
  href: string;
  simMs: number;
}

export interface AwayReport {
  /** True if player was gone long enough and has inflight craft */
  hasNews: boolean;
  awayMs: number | null;
  awayLabel: string | null;
  skyLine: string | null;
  lines: AwayCraftLine[];
  emptyHint: string | null;
}

function craftAwayLine(craft: Craft, advancedMs: number): AwayCraftLine | null {
  if (!craft.orbit || !craft.missionId) return null;
  const simMs = craft.lastSimMs ?? craft.launchedAt ?? Date.now();
  const launchMs = craft.launchedAt ?? simMs;
  const mission = MISSION_PROFILES.find((m) => m.id === craft.missionId);
  const brief = getMissionBriefing(craft.missionId);
  const st = loadObjectiveState(craft.id);
  const objState = st;

  const ctx: ObjectiveContext = {
    missionId: craft.missionId,
    orbit: craft.orbit,
    simMs,
    launchMs,
    scanCount: objState.scanCount,
  };

  const goalsDone = brief.objectives.filter(
    (o) => o.complete(ctx) || objState.completedIds.includes(o.id)
  ).length;
  const goalsTotal = brief.objectives.length;
  const next = brief.objectives.find(
    (o) => !objState.completedIds.includes(o.id) && !o.complete(ctx)
  );

  const missionDays = (simMs - launchMs) / 86400000;
  const period = periodDays(craft.orbit);
  const orbits =
    period > 0 && craft.orbit.centralBody === "earth"
      ? missionDays / period
      : 0;

  const near = nearestBodyName(craft, simMs);
  const rAu = heliocentricDistanceAU(craft.orbit, simMs);

  let headline: string;
  if (advancedMs >= 3600000) {
    if (orbits >= 1) {
      headline = `Completed ~${Math.floor(orbits)} orbit${orbits >= 2 ? "s" : ""} while you were away`;
    } else if (craft.orbit.centralBody === "sun") {
      headline = `Cruised to ${formatDistanceAU(rAu)} from the Sun`;
    } else {
      headline = `Flew for ${formatDuration(advancedMs)} of mission time`;
    }
  } else if (goalsDone >= goalsTotal && goalsTotal > 0) {
    headline = "All mission goals ready to claim in Command";
  } else {
    headline = near
      ? `Still flying near ${near}`
      : "Still on trajectory in the live system";
  }

  const detailParts: string[] = [];
  if (advancedMs >= 60000) {
    detailParts.push(`+${formatDuration(advancedMs)} offline`);
  }
  detailParts.push(`${goalsDone}/${goalsTotal} goals`);
  if (next) detailParts.push(`next: ${next.title}`);
  else if (goalsDone >= goalsTotal) detailParts.push("objectives complete");
  if (near) detailParts.push(`near ${near}`);

  return {
    craftId: craft.id,
    name: craft.name,
    missionName: mission?.name ?? "Mission",
    headline,
    detail: detailParts.join(" · "),
    advancedMs,
    goalsDone,
    goalsTotal,
    nextTitle: next?.title ?? null,
    href: `/mission/${craft.id}`,
    simMs,
  };
}

/**
 * Build report after catch-up. Pass advancedMs by craft id if known.
 */
export function buildAwayReport(
  inflight: Craft[],
  advancedById: Record<string, number> = {}
): AwayReport {
  const lastHome = getLastHomeVisitMs();
  const awayMs =
    lastHome != null ? Math.max(0, Date.now() - lastHome) : null;
  const active = getActiveSkyEvents();
  const skyLine = active.length
    ? active.map((e) => e.name).join(" · ")
    : null;

  if (inflight.length === 0) {
    return {
      hasNews: false,
      awayMs,
      awayLabel: awayMs != null && awayMs > 3600000 ? formatDuration(awayMs) : null,
      skyLine,
      lines: [],
      emptyHint:
        "No craft in flight. Launch a preset probe — it keeps flying while you’re away.",
    };
  }

  const lines: AwayCraftLine[] = [];
  for (const c of inflight) {
    const adv = advancedById[c.id] ?? 0;
    const line = craftAwayLine(c, adv);
    if (line) lines.push(line);
  }

  const meaningfulAway =
    (awayMs != null && awayMs >= 15 * 60000) ||
    Object.values(advancedById).some((ms) => ms >= 15 * 60000);

  return {
    hasNews: meaningfulAway && lines.length > 0,
    awayMs,
    awayLabel:
      awayMs != null && awayMs >= 60000 ? formatDuration(awayMs) : null,
    skyLine,
    lines,
    emptyHint: null,
  };
}

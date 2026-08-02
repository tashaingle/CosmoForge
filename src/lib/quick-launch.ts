/**
 * One-tap launches: preset craft + mission, no builder required.
 * Builder stays available as advanced depth.
 */

import { nanoid } from "nanoid";
import type { MissionProfileId } from "./orbital";
import { MISSION_PROFILES, getAvailableMissions } from "./orbital";
import { computeStats } from "./ship";
import {
  getLocalCommanderName,
  launchCraft,
  upsertCraft,
  type SyncContext,
} from "./storage";
import type { Craft } from "./types";
import { getActiveSkyEvents } from "./sky-events";
import { loadWallet } from "./economy";

export type PresetId = "leo_scout" | "lunar_courier" | "mars_probe";

export interface LaunchPreset {
  id: PresetId;
  /** Short label on the button */
  label: string;
  /** Craft name seed */
  craftName: string;
  blurb: string;
  missionId: MissionProfileId;
  partIds: string[];
  /** UI accent */
  accent: "emerald" | "cyan" | "violet";
}

/** Guaranteed launch-ready stacks (Δv checked at runtime). */
export const LAUNCH_PRESETS: LaunchPreset[] = [
  {
    id: "leo_scout",
    label: "LEO Scout",
    craftName: "LEO Scout",
    blurb: "Park in low Earth orbit in under a minute. Checkout + science.",
    missionId: "leo",
    partIds: [
      "bus_cubesat",
      "solar_small",
      "chem_small",
      "tank_s",
      "camera",
      "antenna_s",
    ],
    accent: "emerald",
  },
  {
    id: "lunar_courier",
    label: "Lunar Courier",
    craftName: "Lunar Courier",
    blurb: "Climb toward the Moon on a high ellipse. The classic first step out.",
    missionId: "lunar",
    partIds: [
      "bus_probe",
      "solar_large",
      "chem_main",
      "tank_m",
      "tank_s",
      "camera",
      "antenna_s",
    ],
    accent: "cyan",
  },
  {
    id: "mars_probe",
    label: "Mars Probe",
    craftName: "Mars Probe",
    blurb: "Hohmann-class transfer toward Mars. Long cruise — check back often.",
    missionId: "mars_transfer",
    partIds: [
      "bus_probe",
      "solar_large",
      "chem_main",
      "tank_l",
      "tank_m",
      "tank_s",
      "spectrometer",
      "hga",
    ],
    accent: "violet",
  },
];

export function getPreset(id: PresetId): LaunchPreset {
  return LAUNCH_PRESETS.find((p) => p.id === id) ?? LAUNCH_PRESETS[0];
}

/** Prefer boosted / event missions, else LEO for first flight. */
export function pickRecommendedPreset(
  hasInflight: boolean,
  now = Date.now()
): LaunchPreset {
  const active = getActiveSkyEvents(now);
  const eventMissionIds = active
    .map((e) => e.eventMissionId)
    .filter(Boolean) as MissionProfileId[];

  // If a sky event boosts a preset mission, recommend that preset
  for (const ev of active) {
    for (const mid of ev.boostMissions) {
      const preset = LAUNCH_PRESETS.find((p) => p.missionId === mid);
      if (preset) return preset;
    }
  }

  // Event-only missions: fall back to LEO scout (easy win during events)
  if (eventMissionIds.length > 0) {
    return getPreset("leo_scout");
  }

  // First craft → LEO; return visits without fleet → lunar; otherwise rotate
  if (!hasInflight) return getPreset("leo_scout");

  const day = Math.floor(now / 86400000);
  return LAUNCH_PRESETS[day % LAUNCH_PRESETS.length];
}

export function presetIsReady(preset: LaunchPreset): {
  ok: boolean;
  deltaVms: number;
  minDeltaV: number;
  reason?: string;
} {
  const stats = computeStats(preset.partIds);
  const mission = MISSION_PROFILES.find((m) => m.id === preset.missionId);
  const minDeltaV = mission?.minDeltaV ?? 0;
  if (!stats.launchReady) {
    return {
      ok: false,
      deltaVms: stats.deltaVms,
      minDeltaV,
      reason: stats.issues[0] ?? "Design not launch-ready",
    };
  }
  if (stats.deltaVms < minDeltaV) {
    return {
      ok: false,
      deltaVms: stats.deltaVms,
      minDeltaV,
      reason: `Need more Δv for ${mission?.name ?? "mission"}`,
    };
  }
  // Event-only missions need the event active
  if (mission?.eventOnly) {
    const available = getAvailableMissions(
      getActiveSkyEvents()
        .map((e) => e.eventMissionId)
        .filter(Boolean) as MissionProfileId[]
    );
    if (!available.some((m) => m.id === preset.missionId)) {
      return {
        ok: false,
        deltaVms: stats.deltaVms,
        minDeltaV,
        reason: "Event mission not active",
      };
    }
  }
  return { ok: true, deltaVms: stats.deltaVms, minDeltaV };
}

export interface QuickLaunchResult {
  ok: boolean;
  craft?: Craft;
  error?: string;
}

/**
 * Create a preset craft and launch it immediately.
 * Skips the design → launch screens entirely.
 */
export function quickLaunch(
  presetId: PresetId,
  sync?: SyncContext,
  options?: { name?: string }
): QuickLaunchResult {
  const preset = getPreset(presetId);
  const check = presetIsReady(preset);
  if (!check.ok) {
    return { ok: false, error: check.reason ?? "Preset not ready" };
  }

  const wallet = loadWallet();
  const now = Date.now();
  const craft: Craft = {
    id: nanoid(10),
    name: options?.name?.trim() || preset.craftName,
    partIds: [...preset.partIds],
    createdAt: now,
    updatedAt: now,
    status: "design",
    commanderName: sync?.commanderName || getLocalCommanderName(),
    skinId: wallet.equippedSkinId || "default",
  };

  upsertCraft(craft, sync);
  const launched = launchCraft(craft.id, preset.missionId, sync);
  if (!launched) {
    return { ok: false, error: "Launch failed — check design requirements." };
  }
  return { ok: true, craft: launched };
}

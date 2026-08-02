/**
 * One-tap launches: personality flavors + preset stacks.
 * Little ships with big personalities.
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
import {
  generateProbeName,
  getPersonality,
  type PersonalityId,
} from "./probe-personality";
import { voyageDurationMs } from "./probe-voyage";

export type PresetId = "leo_scout" | "lunar_courier" | "mars_probe";

export interface LaunchPreset {
  id: PresetId;
  label: string;
  craftName: string;
  blurb: string;
  missionId: MissionProfileId;
  partIds: string[];
  accent: "emerald" | "cyan" | "violet";
  /** Default personality flavor for this odd job */
  personalityId: PersonalityId;
  flavorTitle: string;
}

/** Guaranteed launch-ready stacks with personality. */
export const LAUNCH_PRESETS: LaunchPreset[] = [
  {
    id: "leo_scout",
    label: "Nervous first orbit",
    craftName: "LEO Scout",
    flavorTitle: "Anxious checkout hop",
    blurb:
      "A short LEO job for a probe that triple-checks everything. Back soon with feelings and data.",
    missionId: "leo",
    personalityId: "anxious",
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
    label: "Dramatic Moon errand",
    craftName: "Lunar Courier",
    flavorTitle: "Operatic cislunar jaunt",
    blurb:
      "Climb toward the Moon like it owes them rent. Expect monologues. Expect photos.",
    missionId: "lunar",
    personalityId: "dramatic",
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
    label: "Existential Mars cruise",
    craftName: "Mars Probe",
    flavorTitle: "Long quiet transfer",
    blurb:
      "A long haul toward Mars. They’ll ping. Meaning optional. Souvenirs probable.",
    missionId: "mars_transfer",
    personalityId: "existential",
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

export function pickRecommendedPreset(
  hasInflight: boolean,
  now = Date.now()
): LaunchPreset {
  const active = getActiveSkyEvents(now);
  for (const ev of active) {
    for (const mid of ev.boostMissions) {
      const preset = LAUNCH_PRESETS.find((p) => p.missionId === mid);
      if (preset) return preset;
    }
  }
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
 * Create a character-probe and launch it.
 */
export function quickLaunch(
  presetId: PresetId,
  sync?: SyncContext,
  options?: { name?: string; personalityId?: PersonalityId }
): QuickLaunchResult {
  const preset = getPreset(presetId);
  const check = presetIsReady(preset);
  if (!check.ok) {
    return { ok: false, error: check.reason ?? "Preset not ready" };
  }

  const wallet = loadWallet();
  const now = Date.now();
  const seed = Math.floor(Math.random() * 1e9);
  const personalityId = options?.personalityId ?? preset.personalityId;
  const personality = getPersonality(personalityId);
  const name =
    options?.name?.trim() || generateProbeName(seed);

  const craft: Craft = {
    id: nanoid(10),
    name,
    partIds: [...preset.partIds],
    createdAt: now,
    updatedAt: now,
    status: "design",
    commanderName: sync?.commanderName || getLocalCommanderName(),
    skinId: wallet.equippedSkinId || "default",
    personalityId,
    personalityVibe: personality.vibe,
    scarIds: [],
    pings: [],
    cargoLootIds: [],
    presetId: preset.id,
  };

  upsertCraft(craft, sync);
  const launched = launchCraft(craft.id, preset.missionId, sync);
  if (!launched) {
    return { ok: false, error: "Launch failed — check design requirements." };
  }

  // Ensure voyage timing + first ping flavor
  const withVoyage: Craft = {
    ...launched,
    personalityId,
    personalityVibe: personality.vibe,
    expectedReturnAt: (launched.launchedAt ?? now) + voyageDurationMs(preset.missionId),
    pings: [
      {
        id: "depart",
        atMs: launched.launchedAt ?? now,
        text: `${name} is away. ${personality.vibe}`,
        kind: "chat",
      },
    ],
  };
  upsertCraft(withVoyage, sync);

  return { ok: true, craft: withVoyage };
}

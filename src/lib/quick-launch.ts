/**
 * One-tap launches: personality flavors + preset stacks.
 * Some flavors unlock via loot finds.
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
import { isPresetUnlocked } from "./probe-unlocks";

export type PresetId =
  | "leo_scout"
  | "lunar_courier"
  | "mars_probe"
  | "grumpy_leo"
  | "chipper_leo"
  | "poet_lunar"
  | "chaotic_event"
  | "venus_obsessed"
  | "void_listener"
  | "lucky_bolt_run"
  | "emotional_support";

export interface LaunchPreset {
  id: PresetId;
  label: string;
  craftName: string;
  blurb: string;
  missionId: MissionProfileId;
  partIds: string[];
  accent: "emerald" | "cyan" | "violet" | "amber" | "rose" | "fuchsia";
  personalityId: PersonalityId;
  flavorTitle: string;
}

const LEO_PARTS = [
  "bus_cubesat",
  "solar_small",
  "chem_small",
  "tank_s",
  "camera",
  "antenna_s",
];

const LUNAR_PARTS = [
  "bus_probe",
  "solar_large",
  "chem_main",
  "tank_m",
  "tank_s",
  "camera",
  "antenna_s",
];

const MARS_PARTS = [
  "bus_probe",
  "solar_large",
  "chem_main",
  "tank_l",
  "tank_m",
  "tank_s",
  "spectrometer",
  "hga",
];

const VENUS_PARTS = [
  "bus_probe",
  "solar_large",
  "chem_main",
  "tank_l",
  "tank_m",
  "spectrometer",
  "hga",
];

/** Free + unlockable personality launches */
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
    partIds: LEO_PARTS,
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
    partIds: LUNAR_PARTS,
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
    partIds: MARS_PARTS,
    accent: "violet",
  },
  {
    id: "grumpy_leo",
    label: "Grumpy systems check",
    craftName: "GrumpSat",
    flavorTitle: "Unpaid intern in orbit",
    blurb:
      "Did not ask to be launched. Will complete checkout anyway. Coffee not included.",
    missionId: "leo",
    personalityId: "grumpy",
    partIds: LEO_PARTS,
    accent: "amber",
  },
  {
    id: "chipper_leo",
    label: "Chipper photo pass",
    craftName: "Spark",
    flavorTitle: "Unreasonably okay with vacuum",
    blurb: "Heart emojis as telemetry. Will get the shot. Will say hi to Earth.",
    missionId: "leo",
    personalityId: "chipper",
    partIds: [...LEO_PARTS, "camera"],
    accent: "fuchsia",
  },
  {
    id: "poet_lunar",
    label: "Poet toward the Moon",
    craftName: "Verse",
    flavorTitle: "Lyrical transfer",
    blurb:
      "Telemetry in metaphor. Occasionally useful. Always a little beautiful.",
    missionId: "lunar",
    personalityId: "poet",
    partIds: LUNAR_PARTS,
    accent: "cyan",
  },
  {
    id: "chaotic_event",
    label: "Chaotic belt scout",
    craftName: "Maybe",
    flavorTitle: "Science via improvisation",
    blurb:
      "Safety margins are a suggestion. Ion-sipping toward the belt. lol.",
    missionId: "asteroid_belt",
    personalityId: "chaotic",
    partIds: [
      "bus_probe",
      "solar_large",
      "solar_large",
      "ion_drive",
      "tank_l",
      "tank_l",
      "tank_m",
      "spectrometer",
      "hga",
    ],
    accent: "rose",
  },
  {
    id: "venus_obsessed",
    label: "Venus essay run",
    craftName: "Crush",
    flavorTitle: "Unauthorized planetary thesis",
    blurb:
      "They will write about Venus. You cannot stop them. You can only fund them.",
    missionId: "venus_flyby",
    personalityId: "dramatic",
    partIds: VENUS_PARTS,
    accent: "amber",
  },
  {
    id: "void_listener",
    label: "Void listener",
    craftName: "Hush",
    flavorTitle: "Cursed quiet cruise",
    blurb:
      "For probes that met a friend-shaped void and came back quieter.",
    missionId: "mars_transfer",
    personalityId: "existential",
    partIds: MARS_PARTS,
    accent: "violet",
  },
  {
    id: "lucky_bolt_run",
    label: "Lucky bolt run",
    craftName: "Clutch",
    flavorTitle: "Suspiciously fine LEO",
    blurb:
      "Something should fall off. It won’t. Bring the bolt home again.",
    missionId: "leo",
    personalityId: "chipper",
    partIds: LEO_PARTS,
    accent: "emerald",
  },
  {
    id: "emotional_support",
    label: "Emotional support probe",
    craftName: "Softly",
    flavorTitle: "Feelings optional (not really)",
    blurb:
      "HR-adjacent science. Returns with data and unscheduled emotion.",
    missionId: "lunar",
    personalityId: "anxious",
    partIds: LUNAR_PARTS,
    accent: "fuchsia",
  },
];

export function getPreset(id: PresetId): LaunchPreset {
  return LAUNCH_PRESETS.find((p) => p.id === id) ?? LAUNCH_PRESETS[0];
}

export function pickRecommendedPreset(
  hasInflight: boolean,
  now = Date.now()
): LaunchPreset {
  const freeOrUnlocked = LAUNCH_PRESETS.filter((p) => isPresetUnlocked(p.id));
  const active = getActiveSkyEvents(now);
  for (const ev of active) {
    for (const mid of ev.boostMissions) {
      const preset = freeOrUnlocked.find((p) => p.missionId === mid);
      if (preset) return preset;
    }
  }
  if (!hasInflight) return getPreset("leo_scout");
  const day = Math.floor(now / 86400000);
  return freeOrUnlocked[day % freeOrUnlocked.length] ?? getPreset("leo_scout");
}

export function presetIsReady(preset: LaunchPreset): {
  ok: boolean;
  deltaVms: number;
  minDeltaV: number;
  reason?: string;
} {
  if (!isPresetUnlocked(preset.id)) {
    return {
      ok: false,
      deltaVms: 0,
      minDeltaV: 0,
      reason: "Locked — bring back the right find",
    };
  }
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

export function quickLaunch(
  presetId: PresetId,
  sync?: SyncContext,
  options?: { name?: string; personalityId?: PersonalityId }
): QuickLaunchResult {
  const preset = getPreset(presetId);
  if (!isPresetUnlocked(presetId)) {
    return { ok: false, error: "That odd job is still locked." };
  }
  const check = presetIsReady(preset);
  if (!check.ok) {
    return { ok: false, error: check.reason ?? "Preset not ready" };
  }

  const wallet = loadWallet();
  const now = Date.now();
  const seed = Math.floor(Math.random() * 1e9);
  const personalityId = options?.personalityId ?? preset.personalityId;
  const personality = getPersonality(personalityId);
  const name = options?.name?.trim() || generateProbeName(seed);

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

  const withVoyage: Craft = {
    ...launched,
    personalityId,
    personalityVibe: personality.vibe,
    expectedReturnAt:
      (launched.launchedAt ?? now) + voyageDurationMs(preset.missionId),
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

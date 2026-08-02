/**
 * Loot unlocks new launch flavors (odd jobs / personalities).
 * No import from quick-launch — avoids circular deps.
 */

import {
  loadCollection,
  type LootId,
  type PlayerCollection,
} from "./probe-loot";

export type UnlockablePresetId =
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

export interface UnlockRule {
  presetId: UnlockablePresetId;
  requiresAny?: LootId[];
  requiresAll?: LootId[];
  hint: string;
}

const FREE_PRESETS: UnlockablePresetId[] = [
  "leo_scout",
  "lunar_courier",
  "mars_probe",
];

export const UNLOCK_RULES: UnlockRule[] = [
  {
    presetId: "grumpy_leo",
    requiresAny: ["dust_smudge", "bent_antenna_tip"],
    hint: "Bring back a dust smudge or bent antenna tip",
  },
  {
    presetId: "chipper_leo",
    requiresAny: ["pretty_earthrise", "first_light"],
    hint: "Bring back a pretty Earthrise or first light plate",
  },
  {
    presetId: "poet_lunar",
    requiresAny: ["radio_whisper", "cold_spot"],
    hint: "Bring back a radio whisper or cold spot log",
  },
  {
    presetId: "chaotic_event",
    requiresAny: ["suspicious_reading", "storm_souvenir"],
    hint: "Bring back a suspicious reading or storm souvenir",
  },
  {
    presetId: "venus_obsessed",
    requiresAny: ["venus_fanfic"],
    hint: "Catalogue an unauthorized Venus essay",
  },
  {
    presetId: "void_listener",
    requiresAny: ["friend_shaped_void"],
    hint: "Survive a friend-shaped void (cursed find)",
  },
  {
    presetId: "lucky_bolt_run",
    requiresAny: ["lucky_bolt"],
    hint: "Bring home a lucky bolt",
  },
  {
    presetId: "emotional_support",
    requiresAny: ["unscheduled_emotion"],
    hint: "Catalogue unscheduled emotion",
  },
];

export function isPresetUnlocked(
  presetId: string,
  collection: PlayerCollection = loadCollection()
): boolean {
  if (FREE_PRESETS.includes(presetId as UnlockablePresetId)) return true;
  const rule = UNLOCK_RULES.find((r) => r.presetId === presetId);
  if (!rule) return true;

  const has = (id: LootId) => (collection.found[id] ?? 0) > 0;

  if (rule.requiresAll?.length) {
    return rule.requiresAll.every(has);
  }
  if (rule.requiresAny?.length) {
    return rule.requiresAny.some(has);
  }
  return true;
}

export function unlockHint(presetId: string): string | null {
  if (FREE_PRESETS.includes(presetId as UnlockablePresetId)) return null;
  return UNLOCK_RULES.find((r) => r.presetId === presetId)?.hint ?? null;
}

/** Preset ids newly unlockable after these loot finds */
export function presetIdsUnlockedByLoot(
  newLootIds: LootId[],
  collectionAfter: PlayerCollection
): string[] {
  if (newLootIds.length === 0) return [];
  const out: string[] = [];
  for (const rule of UNLOCK_RULES) {
    const touches = [
      ...(rule.requiresAny ?? []),
      ...(rule.requiresAll ?? []),
    ].some((id) => newLootIds.includes(id));
    if (!touches) continue;
    if (isPresetUnlocked(rule.presetId, collectionAfter)) {
      out.push(rule.presetId);
    }
  }
  return out;
}

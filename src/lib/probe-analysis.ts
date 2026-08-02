/**
 * Light analysis mini-loop on debrief loot.
 * Spend credits → sometimes upgrade loot / add mystery note.
 */

import type { LootId } from "./probe-loot";
import { getLoot, loadCollection, saveCollection } from "./probe-loot";
import { loadWallet, saveWallet } from "./economy";

export const ANALYSIS_COST = 40;

const UPGRADES: Partial<Record<LootId, LootId>> = {
  noise_sample: "suspicious_reading",
  boring_spectrum: "cold_spot",
  dust_smudge: "bent_antenna_tip",
  pretty_earthrise: "first_light",
  first_light: "map_that_lies",
  radio_whisper: "friend_shaped_void",
  storm_souvenir: "unscheduled_emotion",
  suspicious_reading: "map_that_lies",
};

const MYSTERY_NOTES = [
  "Under higher gain the signal repeats once, then apologizes.",
  "The photo has one extra star. Catalogs disagree which.",
  "Instrument log includes a doodle. You didn’t draw it.",
  "Spectrum fits no model. Fits a mood, though.",
  "Debris edge looks like writing if you squint irresponsibly.",
];

export function analyzeLoot(
  lootIds: LootId[],
  debriefKey: string
): {
  ok: boolean;
  error?: string;
  newLootIds?: LootId[];
  note?: string;
  creditsSpent?: number;
  upgraded?: { from: string; to: string } | null;
} {
  const wallet = loadWallet();
  if (wallet.credits < ANALYSIS_COST) {
    return { ok: false, error: `Need ✦ ${ANALYSIS_COST} to examine cargo` };
  }

  const collection = loadCollection();
  const analyzedKey = `analyze:${debriefKey}`;
  if ((collection.found[analyzedKey] ?? 0) > 0) {
    return { ok: false, error: "Already analyzed this return" };
  }

  // mark analyzed using found map as a cheap flag store
  collection.found[analyzedKey] = 1;

  wallet.credits -= ANALYSIS_COST;
  saveWallet(wallet);

  const seed = debriefKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const roll = seed % 100;
  let newLootIds = [...lootIds];
  let upgraded: { from: string; to: string } | null = null;
  let note = MYSTERY_NOTES[seed % MYSTERY_NOTES.length];

  if (roll < 45 && lootIds.length > 0) {
    const from = lootIds[seed % lootIds.length];
    const to = UPGRADES[from];
    if (to) {
      newLootIds = lootIds.map((id, i) =>
        i === seed % lootIds.length ? to : id
      );
      upgraded = { from: getLoot(from).name, to: getLoot(to).name };
      // grant the upgrade into collection
      collection.found[to] = (collection.found[to] ?? 0) + 1;
      note = `Analysis upgraded “${upgraded.from}” into “${upgraded.to}”. ${note}`;
    }
  } else if (roll < 70) {
    note = `Clean analysis. Normal rewards only. (${note})`;
  } else {
    note = `Mystery flag raised. ${note}`;
    collection.found["suspicious_reading"] =
      (collection.found["suspicious_reading"] ?? 0) + 1;
    if (!newLootIds.includes("suspicious_reading")) {
      newLootIds.push("suspicious_reading");
    }
  }

  saveCollection(collection);
  return {
    ok: true,
    newLootIds,
    note,
    creditsSpent: ANALYSIS_COST,
    upgraded,
  };
}

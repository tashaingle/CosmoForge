import { LAUNCH_PRESETS } from "@/lib/quick-launch";
import { isPresetUnlocked } from "@/lib/probe-unlocks";
import type { PlayerCollection } from "@/lib/probe-loot";

export function unlockedPresetCount(collection: PlayerCollection) {
  const total = LAUNCH_PRESETS.length;
  const unlocked = LAUNCH_PRESETS.filter((p) =>
    isPresetUnlocked(p.id, collection)
  ).length;
  return { unlocked, total };
}

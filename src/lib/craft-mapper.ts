import type { Craft } from "./types";
import type { DbCraftRow } from "./supabase";
import type { OrbitElements, MissionProfileId } from "./orbital";

export const CRAFT_STORY_VERSION = 1;

export const CRAFT_STORY_KEYS = [
  "personalityId",
  "personalityVibe",
  "scarIds",
  "pings",
  "cargoLootIds",
  "expectedReturnAt",
  "readyToReturn",
  "lastDebrief",
  "presetId",
  "relationship",
  "voyagesCompleted",
  "hardTrips",
  "softTrips",
  "absurdLaunch",
  "lineageParentId",
  "lineageNote",
  "lastMessage",
  "retiredAt",
  "memorialPlaque",
  "memory",
  "encounterHistory",
  "storyFlags",
  "onboardingMission",
] as const satisfies readonly (keyof Craft)[];

export type CraftStoryKey = (typeof CRAFT_STORY_KEYS)[number];

export type CraftStoryState = {
  version: typeof CRAFT_STORY_VERSION;
} & Pick<Craft, CraftStoryKey>;

export function storyFromCraft(craft: Craft): CraftStoryState {
  const state: CraftStoryState = { version: CRAFT_STORY_VERSION };
  for (const key of CRAFT_STORY_KEYS) {
    if (craft[key] !== undefined) Object.assign(state, { [key]: craft[key] });
  }
  return state;
}

export function applyStory(craft: Craft, state?: CraftStoryState | null): Craft {
  if (!state || state.version !== CRAFT_STORY_VERSION) return craft;
  const next = { ...craft };
  for (const key of CRAFT_STORY_KEYS) {
    if (state[key] !== undefined) Object.assign(next, { [key]: state[key] });
  }
  return next;
}

export function mergeCraft(local: Craft, cloud: Craft): Craft {
  const newer = cloud.updatedAt >= local.updatedAt ? cloud : local;
  const older = newer === cloud ? local : cloud;
  const merged: Craft = { ...older, ...newer };
  for (const key of CRAFT_STORY_KEYS) {
    if (merged[key] === undefined && older[key] !== undefined) Object.assign(merged, { [key]: older[key] });
  }
  return merged;
}

export function rowToCraft(row: DbCraftRow): Craft {
  return {
    id: row.id,
    name: row.name,
    partIds: row.part_ids ?? [],
    status: row.status,
    missionId: (row.mission_id as MissionProfileId) || undefined,
    orbit: (row.orbit as OrbitElements) || undefined,
    launchedAt: row.launched_at
      ? new Date(row.launched_at).getTime()
      : undefined,
    lastSimMs: row.last_sim_ms ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    userId: row.user_id ?? undefined,
    commanderName: row.commander_name ?? undefined,
    skinId: row.skin_id ?? undefined,
  };
}

export function craftToRow(
  craft: Craft,
  userId: string,
  commanderName?: string
) {
  return {
    id: craft.id,
    user_id: userId,
    name: craft.name,
    commander_name: commanderName ?? craft.commanderName ?? null,
    part_ids: craft.partIds,
    status: craft.status,
    mission_id: craft.missionId ?? null,
    orbit: craft.orbit ?? null,
    launched_at: craft.launchedAt
      ? new Date(craft.launchedAt).toISOString()
      : null,
    last_sim_ms: craft.lastSimMs ?? null,
    notes: craft.notes ?? null,
    skin_id: craft.skinId ?? null,
    updated_at: new Date(craft.updatedAt || Date.now()).toISOString(),
  };
}

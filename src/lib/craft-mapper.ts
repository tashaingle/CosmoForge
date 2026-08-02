import type { Craft } from "./types";
import type { DbCraftRow } from "./supabase";
import type { OrbitElements, MissionProfileId } from "./orbital";

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
    updated_at: new Date(craft.updatedAt || Date.now()).toISOString(),
  };
}

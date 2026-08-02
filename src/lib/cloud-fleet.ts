import { getSupabaseBrowser } from "./supabase";
import { craftToRow, rowToCraft } from "./craft-mapper";
import type { Craft, LiveCraftMarker } from "./types";
import type { OrbitElements, MissionProfileId } from "./orbital";

export async function fetchCloudFleet(userId: string): Promise<Craft[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const { data, error } = await sb
    .from("crafts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("[cloud-fleet] fetch", error.message);
    return [];
  }
  return (data ?? []).map(rowToCraft);
}

export async function pushCraftToCloud(
  craft: Craft,
  userId: string,
  commanderName?: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const row = craftToRow(craft, userId, commanderName);
  const { error } = await sb.from("crafts").upsert(row, { onConflict: "id" });
  if (error) {
    console.warn("[cloud-fleet] upsert", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteCraftFromCloud(
  craftId: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { error } = await sb.from("crafts").delete().eq("id", craftId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Merge local + cloud by id, prefer newer updatedAt */
export function mergeFleets(local: Craft[], cloud: Craft[]): Craft[] {
  const map = new Map<string, Craft>();
  for (const c of local) map.set(c.id, c);
  for (const c of cloud) {
    const existing = map.get(c.id);
    if (!existing || c.updatedAt >= existing.updatedAt) {
      map.set(c.id, { ...existing, ...c });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Upload any local-only crafts to cloud after login */
export async function migrateLocalToCloud(
  localCrafts: Craft[],
  userId: string,
  commanderName?: string
): Promise<void> {
  for (const craft of localCrafts) {
    await pushCraftToCloud(craft, userId, commanderName);
  }
}

export async function fetchLiveCrafts(
  excludeId?: string
): Promise<LiveCraftMarker[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];

  const { data, error } = await sb
    .from("crafts")
    .select(
      "id, name, commander_name, mission_id, orbit, launched_at, last_sim_ms, user_id"
    )
    .eq("status", "inflight")
    .not("orbit", "is", null)
    .order("updated_at", { ascending: false })
    .limit(80);

  if (error) {
    console.warn("[cloud-fleet] live", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.id !== excludeId && row.orbit)
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      commanderName:
        (row.commander_name as string) ||
        (row.name as string) ||
        "Commander",
      missionId: (row.mission_id as MissionProfileId) || undefined,
      orbit: row.orbit as OrbitElements,
      launchedAt: row.launched_at
        ? new Date(row.launched_at as string).getTime()
        : undefined,
      lastSimMs: (row.last_sim_ms as number) ?? undefined,
      isSelf: false,
    }));
}

export async function getDisplayName(userId: string): Promise<string | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data } = await sb
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name ?? null;
}

export async function setDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb.from("profiles").upsert({
    id: userId,
    display_name: displayName.slice(0, 40),
  });
}

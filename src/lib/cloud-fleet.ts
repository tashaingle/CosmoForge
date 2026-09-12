import { getSupabaseBrowser, type DbCraftStoryRow, type DbProfileEconomy } from "./supabase";
import { applyStory, craftToRow, mergeCraft, rowToCraft, storyFromCraft, type CraftStoryState } from "./craft-mapper";
import type { Craft, LiveCraftMarker } from "./types";
import type { OrbitElements, MissionProfileId } from "./orbital";
import type { PlayerWallet } from "./economy";

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
  const crafts = (data ?? []).map(rowToCraft);
  const stories = await fetchCraftStories(userId);
  return crafts.map((craft) => applyStory(craft, stories.get(craft.id)));
}

async function fetchCraftStories(userId: string): Promise<Map<string, CraftStoryState>> {
  const sb = getSupabaseBrowser();
  const stories = new Map<string, CraftStoryState>();
  if (!sb) return stories;
  const { data, error } = await sb
    .from("craft_stories")
    .select("craft_id, state")
    .eq("user_id", userId);
  if (error) {
    console.warn("[cloud-fleet] stories", error.message);
    return stories;
  }
  for (const row of (data ?? []) as Pick<DbCraftStoryRow, "craft_id" | "state">[]) {
    const state = row.state as CraftStoryState | null;
    if (state?.version === 1) stories.set(row.craft_id, state);
  }
  return stories;
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
  const { error: storyError } = await sb.from("craft_stories").upsert(
    {
      craft_id: craft.id,
      user_id: userId,
      version: 1,
      state: storyFromCraft(craft),
      updated_at: new Date(craft.updatedAt || Date.now()).toISOString(),
    },
    { onConflict: "craft_id" },
  );
  if (storyError) console.warn("[cloud-fleet] story upsert", storyError.message);
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

/** Merge local + cloud by id, prefer newer updatedAt, keep story fields the newer row omitted. */
export function mergeFleets(local: Craft[], cloud: Craft[]): Craft[] {
  const map = new Map<string, Craft>();
  for (const c of local) map.set(c.id, c);
  for (const c of cloud) {
    const existing = map.get(c.id);
    map.set(c.id, existing ? mergeCraft(existing, c) : c);
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
      "id, name, commander_name, mission_id, orbit, launched_at, last_sim_ms, user_id, skin_id"
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
      skinId: (row.skin_id as string) || undefined,
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

export async function fetchCloudWallet(
  userId: string
): Promise<Partial<PlayerWallet> | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data, error } = await sb
    .from("profiles")
    .select(
      "credits, unlocked_skin_ids, equipped_skin_id, claimed_launch_rewards, claimed_milestones, wallet_updated_at"
    )
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.warn("[cloud-wallet] fetch", error.message);
    return null;
  }
  const row = data as DbProfileEconomy;
  return {
    credits: row.credits ?? undefined,
    unlockedSkinIds: row.unlocked_skin_ids ?? undefined,
    equippedSkinId: row.equipped_skin_id ?? undefined,
    claimedLaunchRewards: row.claimed_launch_rewards ?? undefined,
    claimedMilestones: row.claimed_milestones ?? undefined,
    updatedAt: row.wallet_updated_at
      ? new Date(row.wallet_updated_at).getTime()
      : undefined,
  };
}

export async function pushWalletToCloud(
  userId: string,
  wallet: PlayerWallet
): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const { error } = await sb.from("profiles").upsert({
    id: userId,
    credits: wallet.credits,
    unlocked_skin_ids: wallet.unlockedSkinIds,
    equipped_skin_id: wallet.equippedSkinId,
    claimed_launch_rewards: wallet.claimedLaunchRewards,
    claimed_milestones: wallet.claimedMilestones,
    wallet_updated_at: new Date(wallet.updatedAt).toISOString(),
  });
  if (error) console.warn("[cloud-wallet] push", error.message);
}

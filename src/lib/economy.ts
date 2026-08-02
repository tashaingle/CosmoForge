import { SKINS, type SkinDef } from "./cosmetics";
import {
  bestRewardMultiplier,
  getActiveSkyEvents,
  totalEventBonusCredits,
} from "./sky-events";
import type { MissionProfileId } from "./orbital";
import { MISSION_PROFILES } from "./orbital";

const WALLET_KEY = "cosmoforge-wallet-v1";

export interface PlayerWallet {
  version: 1;
  credits: number;
  unlockedSkinIds: string[];
  equippedSkinId: string;
  /** craftId -> claimed launch reward */
  claimedLaunchRewards: Record<string, number>;
  /** one-time milestone ids */
  claimedMilestones: string[];
  updatedAt: number;
}

const STARTER_CREDITS = 500;

function defaultWallet(): PlayerWallet {
  return {
    version: 1,
    credits: STARTER_CREDITS,
    unlockedSkinIds: SKINS.filter((s) => s.free).map((s) => s.id),
    equippedSkinId: "default",
    claimedLaunchRewards: {},
    claimedMilestones: [],
    updatedAt: Date.now(),
  };
}

export function loadWallet(): PlayerWallet {
  if (typeof window === "undefined") return defaultWallet();
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (!raw) return defaultWallet();
    const w = JSON.parse(raw) as PlayerWallet;
    if (!w || w.version !== 1) return defaultWallet();
    // ensure free skins
    for (const s of SKINS) {
      if (s.free && !w.unlockedSkinIds.includes(s.id)) {
        w.unlockedSkinIds.push(s.id);
      }
    }
    return w;
  } catch {
    return defaultWallet();
  }
}

export function saveWallet(w: PlayerWallet): void {
  if (typeof window === "undefined") return;
  w.updatedAt = Date.now();
  localStorage.setItem(WALLET_KEY, JSON.stringify(w));
}

export function replaceWallet(w: PlayerWallet): PlayerWallet {
  saveWallet(w);
  return w;
}

export function baseMissionReward(missionId: MissionProfileId): number {
  const m = MISSION_PROFILES.find((x) => x.id === missionId);
  if (!m) return 50;
  switch (m.difficulty) {
    case "easy":
      return 100;
    case "medium":
      return 180;
    case "hard":
      return 280;
    default:
      return 100;
  }
}

/** Extra for event-only missions */
export function eventMissionBonus(missionId: MissionProfileId): number {
  if (missionId.startsWith("event_")) return 120;
  return 0;
}

/** Optional live JPL/DONKI boost applied client-side after /api/sky-feed load */
let liveBoost: {
  multiplier: number;
  bonusCredits: number;
  labels: string[];
} | null = null;

export function setLiveRewardBoost(
  boost: {
    multiplier: number;
    bonusCredits: number;
    labels: string[];
  } | null
): void {
  liveBoost = boost;
}

export function getLiveRewardBoost() {
  return liveBoost;
}

export function computeLaunchReward(
  missionId: MissionProfileId,
  now = Date.now()
): {
  total: number;
  base: number;
  eventBonus: number;
  multiplier: number;
  events: string[];
} {
  const base = baseMissionReward(missionId) + eventMissionBonus(missionId);
  const mult = bestRewardMultiplier(now);
  const flat = totalEventBonusCredits(now);
  // Only apply flat bonus if mission is boosted by at least one event OR is event mission
  const active = getActiveSkyEvents(now);
  const relevant = active.filter(
    (e) =>
      e.boostMissions.includes(missionId) ||
      e.eventMissionId === missionId ||
      missionId.startsWith("event_")
  );
  let eventFlat =
    relevant.length > 0
      ? relevant.reduce((s, e) => s + e.bonusCredits, 0)
      : missionId.startsWith("event_")
        ? flat
        : 0;
  let multApplied =
    relevant.length > 0 || missionId.startsWith("event_") ? mult : 1;
  const events = relevant.map((e) => e.name);

  // Stack live JPL/DONKI activity (NEO approaches, flares)
  if (liveBoost && liveBoost.multiplier > 1) {
    multApplied = Math.max(multApplied, liveBoost.multiplier);
    // Apply a portion of live flat bonus on any launch while live events active
    eventFlat += Math.round(liveBoost.bonusCredits * 0.5);
    events.push(...liveBoost.labels.slice(0, 3));
  }

  const total = Math.round(base * multApplied + eventFlat);
  return {
    total,
    base,
    eventBonus: eventFlat,
    multiplier: multApplied,
    events,
  };
}

export function claimLaunchReward(
  craftId: string,
  missionId: MissionProfileId
): { wallet: PlayerWallet; gained: number; alreadyClaimed: boolean } {
  const wallet = loadWallet();
  if (wallet.claimedLaunchRewards[craftId] != null) {
    return {
      wallet,
      gained: wallet.claimedLaunchRewards[craftId],
      alreadyClaimed: true,
    };
  }
  const { total } = computeLaunchReward(missionId);
  wallet.credits += total;
  wallet.claimedLaunchRewards[craftId] = total;
  // milestones
  const launches = Object.keys(wallet.claimedLaunchRewards).length;
  if (launches >= 1 && !wallet.claimedMilestones.includes("first_launch")) {
    wallet.claimedMilestones.push("first_launch");
    wallet.credits += 50;
  }
  if (launches >= 3 && !wallet.claimedMilestones.includes("fleet_3")) {
    wallet.claimedMilestones.push("fleet_3");
    wallet.credits += 100;
  }
  saveWallet(wallet);
  return { wallet, gained: total, alreadyClaimed: false };
}

export function canBuySkin(
  wallet: PlayerWallet,
  skin: SkinDef,
  activeEventIds: string[]
): { ok: boolean; reason?: string } {
  if (wallet.unlockedSkinIds.includes(skin.id)) {
    return { ok: false, reason: "Already owned" };
  }
  if (skin.eventId && !activeEventIds.includes(skin.eventId)) {
    return { ok: false, reason: "Limited event cosmetic — not available now" };
  }
  if (wallet.credits < skin.priceCredits) {
    return { ok: false, reason: "Not enough credits" };
  }
  return { ok: true };
}

export function purchaseSkin(
  skinId: string,
  activeEventIds: string[]
): { wallet: PlayerWallet; error?: string } {
  const wallet = loadWallet();
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin) return { wallet, error: "Unknown skin" };
  const check = canBuySkin(wallet, skin, activeEventIds);
  if (!check.ok) return { wallet, error: check.reason };
  wallet.credits -= skin.priceCredits;
  wallet.unlockedSkinIds.push(skin.id);
  saveWallet(wallet);
  return { wallet };
}

export function equipSkin(skinId: string): PlayerWallet {
  const wallet = loadWallet();
  if (!wallet.unlockedSkinIds.includes(skinId)) return wallet;
  wallet.equippedSkinId = skinId;
  saveWallet(wallet);
  return wallet;
}

export function mergeWallets(
  local: PlayerWallet,
  cloud: Partial<PlayerWallet> | null
): PlayerWallet {
  if (!cloud) return local;
  const unlocked = new Set([
    ...local.unlockedSkinIds,
    ...(cloud.unlockedSkinIds ?? []),
  ]);
  const claimed = {
    ...cloud.claimedLaunchRewards,
    ...local.claimedLaunchRewards,
  };
  const milestones = new Set([
    ...local.claimedMilestones,
    ...(cloud.claimedMilestones ?? []),
  ]);
  // Prefer higher credits if cloud is newer, else max of both (anti-loss)
  const credits =
    (cloud.updatedAt ?? 0) > local.updatedAt
      ? Math.max(cloud.credits ?? 0, local.credits)
      : Math.max(local.credits, cloud.credits ?? 0);

  return {
    version: 1,
    credits,
    unlockedSkinIds: Array.from(unlocked),
    equippedSkinId:
      (cloud.updatedAt ?? 0) > local.updatedAt
        ? cloud.equippedSkinId || local.equippedSkinId
        : local.equippedSkinId,
    claimedLaunchRewards: claimed,
    claimedMilestones: Array.from(milestones),
    updatedAt: Date.now(),
  };
}

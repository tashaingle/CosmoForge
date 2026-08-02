/**
 * Daily briefing, rotating quests, and login streaks — retention layer.
 */

import { getActiveSkyEvents, getUpcomingSkyEvents } from "./sky-events";
import { loadPassport, passportStats } from "./passport";
import { loadFleet } from "./storage";
import {
  loadWallet,
  saveWallet,
  computeLaunchReward,
  getLiveRewardBoost,
  type PlayerWallet,
} from "./economy";
import { getMissionBriefing, loadObjectiveState } from "./mission-objectives";
import { MISSION_PROFILES } from "./orbital";

const DAILY_KEY = "cosmoforge-daily-v1";

export type QuestKind =
  | "launch"
  | "objective"
  | "scan"
  | "stamp"
  | "open_mission";

export interface DailyQuestDef {
  id: string;
  kind: QuestKind;
  title: string;
  description: string;
  target: number;
  rewardCredits: number;
}

export interface DailyState {
  version: 1;
  /** UTC date YYYY-MM-DD */
  dayKey: string;
  questId: string;
  progress: number;
  claimed: boolean;
  /** Consecutive days with a claimed quest */
  streak: number;
  /** Last day a quest was claimed */
  lastClaimDay: string | null;
  /** Days the player opened the hangar (for soft streak) */
  lastActiveDay: string | null;
  activeStreak: number;
}

export interface DailyBriefing {
  dayKey: string;
  greeting: string;
  headline: string;
  bullets: string[];
  bestMission?: {
    id: string;
    name: string;
    reason: string;
    estCredits: number;
  };
  passportHint?: string;
  fleetHint?: string;
  skyLine?: string;
}

const QUESTS: DailyQuestDef[] = [
  {
    id: "launch_1",
    kind: "launch",
    title: "Ignition day",
    description: "Launch any spacecraft.",
    target: 1,
    rewardCredits: 80,
  },
  {
    id: "objective_1",
    kind: "objective",
    title: "Mission checklist",
    description: "Complete 1 in-flight objective.",
    target: 1,
    rewardCredits: 90,
  },
  {
    id: "objective_2",
    kind: "objective",
    title: "Double duty",
    description: "Complete 2 in-flight objectives.",
    target: 2,
    rewardCredits: 140,
  },
  {
    id: "scan_2",
    kind: "scan",
    title: "Science shift",
    description: "Run 2 science scans.",
    target: 2,
    rewardCredits: 75,
  },
  {
    id: "scan_3",
    kind: "scan",
    title: "Survey team",
    description: "Run 3 science scans.",
    target: 3,
    rewardCredits: 110,
  },
  {
    id: "stamp_1",
    kind: "stamp",
    title: "Passport run",
    description: "Stamp 1 new world on your solar passport.",
    target: 1,
    rewardCredits: 100,
  },
  {
    id: "open_1",
    kind: "open_mission",
    title: "Command time",
    description: "Open any in-flight mission (Command).",
    target: 1,
    rewardCredits: 40,
  },
];

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function dayIndex(dayKey: string): number {
  // days since unix epoch UTC
  return Math.floor(Date.parse(dayKey + "T00:00:00.000Z") / 86400000);
}

function pickQuestForDay(dayKey: string): DailyQuestDef {
  const idx = dayIndex(dayKey);
  return QUESTS[((idx % QUESTS.length) + QUESTS.length) % QUESTS.length];
}

function defaultState(dayKey: string): DailyState {
  const q = pickQuestForDay(dayKey);
  return {
    version: 1,
    dayKey,
    questId: q.id,
    progress: 0,
    claimed: false,
    streak: 0,
    lastClaimDay: null,
    lastActiveDay: null,
    activeStreak: 0,
  };
}

export function loadDailyState(): DailyState {
  if (typeof window === "undefined") return defaultState(utcDayKey());
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    const today = utcDayKey();
    if (!raw) {
      const s = defaultState(today);
      saveDailyState(s);
      return s;
    }
    const s = JSON.parse(raw) as DailyState;
    if (s?.version !== 1) {
      const n = defaultState(today);
      saveDailyState(n);
      return n;
    }
    // Roll to new day
    if (s.dayKey !== today) {
      const prevClaim = s.lastClaimDay;
      const rolled: DailyState = {
        ...defaultState(today),
        streak: s.streak,
        lastClaimDay: prevClaim,
        lastActiveDay: s.lastActiveDay,
        activeStreak: s.activeStreak,
      };
      // Break claim streak if they skipped a day after last claim
      if (prevClaim) {
        const gap = dayIndex(today) - dayIndex(prevClaim);
        if (gap > 1) rolled.streak = 0;
      }
      saveDailyState(rolled);
      return rolled;
    }
    return s;
  } catch {
    return defaultState(utcDayKey());
  }
}

export function saveDailyState(s: DailyState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_KEY, JSON.stringify(s));
}

export function getQuestDef(questId: string): DailyQuestDef {
  return QUESTS.find((q) => q.id === questId) ?? QUESTS[0];
}

export function getTodayQuest(): {
  state: DailyState;
  quest: DailyQuestDef;
  complete: boolean;
} {
  const state = loadDailyState();
  const quest = getQuestDef(state.questId);
  return {
    state,
    quest,
    complete: state.progress >= quest.target,
  };
}

/** Call when player opens hangar */
export function noteHangarVisit(): DailyState {
  const s = loadDailyState();
  const today = utcDayKey();
  if (s.lastActiveDay === today) return s;

  let activeStreak = s.activeStreak;
  if (s.lastActiveDay) {
    const gap = dayIndex(today) - dayIndex(s.lastActiveDay);
    if (gap === 1) activeStreak = Math.max(1, activeStreak) + 1;
    else if (gap > 1) activeStreak = 1;
  } else {
    activeStreak = 1;
  }
  const next = { ...s, lastActiveDay: today, activeStreak };
  saveDailyState(next);
  return next;
}

function bumpProgress(kind: QuestKind, amount = 1): DailyState {
  const s = loadDailyState();
  const quest = getQuestDef(s.questId);
  if (s.claimed || quest.kind !== kind) return s;
  const progress = Math.min(quest.target, s.progress + amount);
  const next = { ...s, progress };
  saveDailyState(next);
  return next;
}

export function trackDailyLaunch(): void {
  bumpProgress("launch", 1);
}

export function trackDailyObjective(): void {
  bumpProgress("objective", 1);
}

export function trackDailyScan(): void {
  bumpProgress("scan", 1);
}

export function trackDailyStamp(): void {
  bumpProgress("stamp", 1);
}

export function trackDailyOpenMission(): void {
  bumpProgress("open_mission", 1);
}

export function claimDailyQuest(): {
  ok: boolean;
  credits: number;
  streak: number;
  streakBonus: number;
  error?: string;
  wallet?: PlayerWallet;
} {
  const s = loadDailyState();
  const quest = getQuestDef(s.questId);
  if (s.claimed) return { ok: false, credits: 0, streak: s.streak, streakBonus: 0, error: "Already claimed today" };
  if (s.progress < quest.target) {
    return {
      ok: false,
      credits: 0,
      streak: s.streak,
      streakBonus: 0,
      error: "Quest not finished yet",
    };
  }

  const today = utcDayKey();
  let streak = 1;
  if (s.lastClaimDay) {
    const gap = dayIndex(today) - dayIndex(s.lastClaimDay);
    if (gap === 1) streak = s.streak + 1;
    else streak = 1;
  }

  // Streak bonus: +15 per day after first, cap +90
  const streakBonus = Math.min(90, Math.max(0, (streak - 1) * 15));
  let credits = quest.rewardCredits + streakBonus;

  // Milestone streak bonuses
  if (streak === 3) credits += 50;
  if (streak === 7) credits += 150;

  const wallet = loadWallet();
  wallet.credits += credits;
  saveWallet(wallet);

  const next: DailyState = {
    ...s,
    claimed: true,
    streak,
    lastClaimDay: today,
  };
  saveDailyState(next);

  return { ok: true, credits, streak, streakBonus, wallet };
}

export function buildDailyBriefing(): DailyBriefing {
  const dayKey = utcDayKey();
  const active = getActiveSkyEvents();
  const upcoming = getUpcomingSkyEvents(Date.now(), 3);
  const passport = passportStats(loadPassport());
  const fleet = loadFleet();
  const inflight = fleet.crafts.filter((c) => c.status === "inflight");

  const bullets: string[] = [];

  // Sky
  let skyLine: string | undefined;
  if (active.length) {
    skyLine = active.map((e) => e.name).join(" · ");
    bullets.push(
      `Sky event live: ${skyLine} — launches pay more while it lasts.`
    );
  } else if (upcoming[0]) {
    skyLine = `Next: ${upcoming[0].name}`;
    bullets.push(
      `Next catalog window: ${upcoming[0].name} (prep a ship).`
    );
  }

  // Live boost if any
  const live = getLiveRewardBoost();
  if (live && live.multiplier > 1) {
    bullets.push(
      `Live JPL/solar activity boosting rewards (up to ×${live.multiplier.toFixed(2)}).`
    );
  }

  // Best mission by est credits among non-event or available
  let bestMission: DailyBriefing["bestMission"];
  const candidates = MISSION_PROFILES.filter((m) => !m.eventOnly);
  let topPay = 0;
  for (const m of candidates) {
    const r = computeLaunchReward(m.id);
    if (r.total > topPay) {
      topPay = r.total;
      bestMission = {
        id: m.id,
        name: m.name,
        reason: active.some((e) => e.boostMissions.includes(m.id))
          ? "Boosted by today’s sky window"
          : "Solid base payout right now",
        estCredits: r.total,
      };
    }
  }
  if (bestMission) {
    bullets.push(
      `Best launch pay now: ${bestMission.name} (~✦ ${bestMission.estCredits}).`
    );
  }

  // Passport
  let passportHint: string | undefined;
  if (passport.found < passport.total) {
    const next = passport.missing[0];
    passportHint = next
      ? `Passport: ${passport.found}/${passport.total} — try for ${next.name} next.`
      : `Passport: ${passport.found}/${passport.total}.`;
    bullets.push(passportHint);
  } else {
    bullets.push("Passport complete — chase event missions and cosmetics.");
  }

  // Fleet
  let fleetHint: string | undefined;
  if (inflight.length === 0) {
    fleetHint = "No craft in flight — launch one to start today’s loop.";
    bullets.push(fleetHint);
  } else {
    const statuses = inflight.map((c) => {
      const st = loadObjectiveState(c.id);
      const brief = getMissionBriefing(c.missionId);
      const done = st.completedIds.length;
      const total = brief.objectives.length;
      return { c, done, total, brief };
    });
    const incomplete = statuses.find((s) => s.done < s.total) ?? statuses[0];
    fleetHint = `${inflight.length} in flight · ${incomplete.c.name}: ${incomplete.done}/${incomplete.total} goals.`;
    bullets.push(fleetHint);
  }

  const hour = new Date().getUTCHours();
  const greeting =
    hour < 12 ? "Good morning, commander" : hour < 18 ? "Good afternoon, commander" : "Good evening, commander";

  const headline = active.length
    ? "The real sky is busy — good day to fly."
    : inflight.length
      ? "Your fleet is working — finish goals or stamp a world."
      : "One-tap launch a probe — it keeps flying while you’re away.";

  return {
    dayKey,
    greeting,
    headline,
    bullets: bullets.slice(0, 5),
    bestMission,
    passportHint,
    fleetHint,
    skyLine,
  };
}

export interface FleetStatusCard {
  craftId: string;
  name: string;
  missionName: string;
  purpose: string;
  done: number;
  total: number;
  nextTitle: string | null;
  nextProgress: number;
  tip: string;
  href: string;
}

/** Static tip without full sim context — uses completed counts only */
export function buildFleetStatusCards(): FleetStatusCard[] {
  const fleet = loadFleet();
  return fleet.crafts
    .filter((c) => c.status === "inflight" && c.missionId)
    .map((c) => {
      const brief = getMissionBriefing(c.missionId);
      const st = loadObjectiveState(c.id);
      const done = brief.objectives.filter((o) =>
        st.completedIds.includes(o.id)
      ).length;
      const total = brief.objectives.length;
      const next = brief.objectives.find((o) => !st.completedIds.includes(o.id));
      const mission = MISSION_PROFILES.find((m) => m.id === c.missionId);
      let tip = "Open Command and use time warp.";
      if (next) {
        if (next.id.includes("scan") || next.title.toLowerCase().includes("scan")) {
          tip = "Open Command → Science scan (then warp if cooling down).";
        } else if (
          next.title.toLowerCase().includes("orbit") ||
          next.id.includes("orbit")
        ) {
          tip = "Open Command → set 10k×–100k× warp until the bar fills.";
        } else {
          tip = `Open Command → warp until “${next.title}” completes.`;
        }
      } else {
        tip = "All goals done — launch a new destination for passport stamps.";
      }
      return {
        craftId: c.id,
        name: c.name,
        missionName: mission?.name ?? "Mission",
        purpose: brief.purpose,
        done,
        total,
        nextTitle: next?.title ?? null,
        nextProgress: done / Math.max(1, total),
        tip,
        href: `/mission/${c.id}`,
      };
    });
}

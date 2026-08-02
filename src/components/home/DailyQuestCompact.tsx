"use client";

import { useCallback, useEffect, useState } from "react";
import {
  claimDailyQuest,
  getTodayQuest,
  noteHangarVisit,
  type DailyQuestDef,
  type DailyState,
} from "@/lib/daily";
import { useAuth } from "@/components/auth/AuthProvider";

/** Slim daily quest bar — full briefing lives in the fleet loop now. */
export function DailyQuestCompact() {
  const { persistWallet, refreshWallet } = useAuth();
  const [quest, setQuest] = useState<DailyQuestDef | null>(null);
  const [state, setState] = useState<DailyState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    noteHangarVisit();
    const t = getTodayQuest();
    setQuest(t.quest);
    setState(t.state);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onClaim() {
    const res = claimDailyQuest();
    if (!res.ok) {
      setMsg(res.error || "Could not claim");
      return;
    }
    if (res.wallet) await persistWallet(res.wallet);
    refreshWallet();
    setMsg(
      `+✦ ${res.credits}` +
        (res.streakBonus ? ` (+${res.streakBonus} streak)` : "") +
        ` · ${res.streak}-day streak`
    );
    refresh();
  }

  if (!quest || !state) return null;

  const pct = Math.min(100, Math.round((state.progress / quest.target) * 100));
  const done = state.progress >= quest.target;

  return (
    <section
      id="today"
      className="rounded-2xl border border-amber-400/20 bg-slate-900/50 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
            Daily · streak {state.activeStreak}d
          </p>
          <h3 className="mt-0.5 font-semibold text-white">{quest.title}</h3>
          <p className="text-sm text-slate-400">{quest.description}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-amber-200">
            ✦ {quest.rewardCredits}
          </p>
          {state.claimed ? (
            <span className="text-xs text-emerald-400">Claimed</span>
          ) : (
            <button
              type="button"
              disabled={!done}
              onClick={() => void onClaim()}
              className="mt-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {done ? "Claim" : `${state.progress}/${quest.target}`}
            </button>
          )}
        </div>
      </div>
      {!state.claimed && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${done ? "bg-emerald-400" : "bg-amber-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {msg && (
        <p className="mt-2 text-sm text-emerald-300" role="status">
          {msg}
        </p>
      )}
    </section>
  );
}

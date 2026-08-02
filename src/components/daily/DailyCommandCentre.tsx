"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  buildDailyBriefing,
  buildFleetStatusCards,
  claimDailyQuest,
  getTodayQuest,
  noteHangarVisit,
  type DailyBriefing,
  type DailyQuestDef,
  type DailyState,
  type FleetStatusCard,
} from "@/lib/daily";
import { useAuth } from "@/components/auth/AuthProvider";

export function DailyCommandCentre() {
  const { persistWallet, refreshWallet } = useAuth();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [quest, setQuest] = useState<DailyQuestDef | null>(null);
  const [state, setState] = useState<DailyState | null>(null);
  const [fleet, setFleet] = useState<FleetStatusCard[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    noteHangarVisit();
    const t = getTodayQuest();
    setQuest(t.quest);
    setState(t.state);
    setBriefing(buildDailyBriefing());
    setFleet(buildFleetStatusCards());
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 8000);
    return () => clearInterval(id);
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
      `+✦ ${res.credits} claimed · ${res.streak}-day streak` +
        (res.streakBonus ? ` (+✦ ${res.streakBonus} streak)` : "")
    );
    refresh();
  }

  if (!briefing || !quest || !state) return null;

  const pct = Math.min(100, Math.round((state.progress / quest.target) * 100));
  const done = state.progress >= quest.target;

  return (
    <section id="today" className="relative mx-auto max-w-6xl space-y-4 px-4 pb-8">
      {/* Briefing */}
      <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/50 via-slate-900/80 to-slate-950 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
              Today · {briefing.dayKey} UTC
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              {briefing.greeting}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              {briefing.headline}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Visit streak
            </p>
            <p className="text-2xl font-bold tabular-nums text-cyan-300">
              {state.activeStreak}
              <span className="text-sm font-normal text-slate-500">d</span>
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
          {briefing.bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {briefing.bestMission && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/#hangar"
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              onClick={() => {
                /* user creates/launches from hangar */
              }}
            >
              Best pay: {briefing.bestMission.name} (~✦{" "}
              {briefing.bestMission.estCredits})
            </Link>
            <span className="text-xs text-slate-500">
              {briefing.bestMission.reason}
            </span>
          </div>
        )}
      </div>

      {/* Daily quest */}
      <div className="rounded-2xl border border-amber-400/25 bg-slate-900/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
              Daily quest
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {quest.title}
            </h3>
            <p className="mt-0.5 text-sm text-slate-400">{quest.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Reward</p>
            <p className="text-lg font-semibold tabular-nums text-amber-200">
              ✦ {quest.rewardCredits}
              {state.streak > 0 && (
                <span className="ml-1 text-xs font-normal text-slate-500">
                  · claim streak {state.streak}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>
              Progress {state.progress}/{quest.target}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                done ? "bg-emerald-400" : "bg-amber-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {state.claimed ? (
            <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-300">
              Claimed today — see you tomorrow
            </span>
          ) : (
            <button
              type="button"
              disabled={!done}
              onClick={() => void onClaim()}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {done ? "Claim reward" : "In progress…"}
            </button>
          )}
          <p className="text-xs text-slate-500">
            Claim streaks: +15 cr/day (cap +90) · bonus at 3 and 7 days
          </p>
        </div>
        {msg && (
          <p className="mt-2 text-sm text-emerald-300" role="status">
            {msg}
          </p>
        )}
      </div>

      {/* Fleet status */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">Your fleet</h3>
            <p className="text-sm text-slate-400">
              What to do next on each craft in flight — no guessing.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="text-xs text-slate-400 hover:text-cyan-300"
          >
            Refresh status
          </button>
        </div>
        {fleet.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
            <p className="text-sm text-slate-400">
              Nothing in flight. Launch a craft to start objectives and the
              daily loop.
            </p>
            <a
              href="#hangar"
              className="mt-3 inline-block text-sm text-cyan-400 hover:underline"
            >
              Go to hangar →
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {fleet.map((f) => (
              <li
                key={f.craftId}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{f.name}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-300">
                      {f.missionName}
                    </span>
                    <span className="text-xs tabular-nums text-cyan-300">
                      {f.done}/{f.total} goals
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{f.purpose}</p>
                  {f.nextTitle ? (
                    <p className="mt-1 text-sm text-slate-300">
                      Next:{" "}
                      <span className="text-amber-100">{f.nextTitle}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-emerald-300">
                      All objectives complete
                    </p>
                  )}
                  <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{
                        width: `${Math.round(f.nextProgress * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{f.tip}</p>
                </div>
                <Link
                  href={f.href}
                  className="shrink-0 rounded-xl bg-cyan-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Command
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

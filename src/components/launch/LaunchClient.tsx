"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAvailableMissions,
  type MissionProfileId,
} from "@/lib/orbital";
import { computeStats, formatDeltaV } from "@/lib/ship";
import { getCraft, launchCraft, upsertCraft } from "@/lib/storage";
import type { Craft } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
  getActiveSkyEvents,
  isMissionBoosted,
} from "@/lib/sky-events";
import { computeLaunchReward } from "@/lib/economy";
import { missionPurposeLine } from "@/lib/mission-objectives";

export function LaunchClient({ craftId }: { craftId: string }) {
  const router = useRouter();
  const { ready, syncContext, user, wallet } = useAuth();
  const [craft, setCraft] = useState<Craft | null | undefined>(undefined);
  const [missionId, setMissionId] = useState<MissionProfileId>("leo");
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  const active = useMemo(() => getActiveSkyEvents(), []);
  const eventMissionIds = useMemo(
    () =>
      active
        .map((e) => e.eventMissionId)
        .filter(Boolean) as MissionProfileId[],
    [active]
  );
  const missions = useMemo(
    () => getAvailableMissions(eventMissionIds),
    [eventMissionIds]
  );

  useEffect(() => {
    if (!ready) return;
    setCraft(getCraft(craftId) ?? null);
  }, [craftId, ready]);

  useEffect(() => {
    if (!missions.find((m) => m.id === missionId) && missions[0]) {
      setMissionId(missions[0].id);
    }
  }, [missions, missionId]);

  if (!ready || craft === undefined) {
    return <LoadingScreen label="Preparing launch…" />;
  }

  if (!craft) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <p>Craft not found.</p>
        <Link href="/#fleet" className="text-cyan-400">
          Fleet
        </Link>
      </div>
    );
  }

  if (craft.status === "inflight") {
    router.replace(`/mission/${craft.id}`);
    return null;
  }

  const stats = computeStats(craft.partIds);
  const mission = missions.find((m) => m.id === missionId) ?? missions[0];
  const canFly =
    mission &&
    stats.launchReady &&
    stats.deltaVms >= mission.minDeltaV;
  const reward = mission ? computeLaunchReward(mission.id) : null;
  const boost = mission ? isMissionBoosted(mission.id) : undefined;

  function onLaunch() {
    setError(null);
    if (!mission || !canFly) {
      setError(
        mission
          ? `Need at least ${formatDeltaV(mission.minDeltaV)} Δv for ${mission.name}.`
          : "No mission selected."
      );
      return;
    }
    setLaunching(true);
    const withSkin = {
      ...craft!,
      skinId: craft!.skinId || wallet.equippedSkinId || "default",
    };
    upsertCraft(withSkin, syncContext);
    const next = launchCraft(withSkin.id, mission.id, syncContext);
    if (!next) {
      setError("Launch failed — check design requirements.");
      setLaunching(false);
      return;
    }
    // re-apply skin on launched craft via storage already done; patch if needed
    router.push(`/mission/${next.id}`);
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,_#164e6366,_transparent_40%),radial-gradient(circle_at_80%_80%,_#1e3a8a44,_transparent_40%)]" />

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Link
          href={`/design/${craft.id}`}
          className="text-sm text-slate-400 hover:text-cyan-300"
        >
          ← Back to design
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          Launch {craft.name}
        </h1>
        <p className="mt-2 text-sm text-slate-400 sm:text-base">
          Available Δv:{" "}
          <span className="font-semibold text-cyan-300">
            {formatDeltaV(stats.deltaVms)}
          </span>
          {" · "}
          Balance:{" "}
          <span className="font-semibold text-amber-200">
            ✦ {wallet.credits} cr
          </span>
        </p>

        {active.length > 0 && (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            <span className="font-semibold">Sky event active:</span>{" "}
            {active.map((e) => e.name).join(" · ")}
          </div>
        )}

        <div className="mt-6 space-y-3 sm:mt-8">
          {missions.map((m) => {
            const ok = stats.deltaVms >= m.minDeltaV;
            const selected = missionId === m.id;
            const mBoost = isMissionBoosted(m.id);
            const mReward = computeLaunchReward(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMissionId(m.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-cyan-400/50 bg-cyan-500/10"
                    : "border-white/10 bg-slate-900/60 hover:border-white/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{m.name}</span>
                      {m.eventOnly && (
                        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] uppercase text-violet-200">
                          Event
                        </span>
                      )}
                      {mBoost && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] uppercase text-emerald-200">
                          Boosted
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {m.description}
                    </p>
                    <p className="mt-1 text-xs text-cyan-200/90">
                      Goal: {missionPurposeLine(m.id)}
                    </p>
                    <p className="mt-1 text-xs text-amber-200/90">
                      Launch pay ~✦ {mReward.total}
                      {mReward.multiplier > 1
                        ? ` (×${mReward.multiplier})`
                        : ""}{" "}
                      + objective bonuses in flight
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 uppercase ${
                        m.difficulty === "easy"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : m.difficulty === "medium"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {m.difficulty}
                    </span>
                    <p
                      className={`mt-2 tabular-nums ${
                        ok ? "text-slate-300" : "text-rose-300"
                      }`}
                    >
                      min {formatDeltaV(m.minDeltaV)}
                      {!ok && " · short"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {reward && boost && (
          <p className="mt-3 text-xs text-emerald-300/90">
            {boost.name} is boosting this profile.
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}

        {!user && (
          <p className="mt-3 text-xs text-amber-200/80">
            Tip: sign in so this craft (and your cosmetics) appear on the shared
            map.
          </p>
        )}

        <button
          type="button"
          disabled={!canFly || launching}
          onClick={onLaunch}
          className="mt-8 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3.5 text-center text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none"
        >
          {launching
            ? "Ignition…"
            : canFly && mission
              ? `Launch — ${mission.name}${
                  reward ? ` · +✦ ${reward.total}` : ""
                }`
              : "Insufficient Δv or incomplete design"}
        </button>
      </div>
    </div>
  );
}

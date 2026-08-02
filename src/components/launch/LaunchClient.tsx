"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MISSION_PROFILES,
  type MissionProfileId,
} from "@/lib/orbital";
import { computeStats, formatDeltaV } from "@/lib/ship";
import { getCraft, launchCraft } from "@/lib/storage";
import type { Craft } from "@/lib/types";

export function LaunchClient({ craftId }: { craftId: string }) {
  const router = useRouter();
  const [craft, setCraft] = useState<Craft | null | undefined>(undefined);
  const [missionId, setMissionId] = useState<MissionProfileId>("leo");
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    setCraft(getCraft(craftId) ?? null);
  }, [craftId]);

  if (craft === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  if (!craft) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <p>Craft not found.</p>
        <Link href="/" className="text-cyan-400">
          Hangar
        </Link>
      </div>
    );
  }

  if (craft.status === "inflight") {
    router.replace(`/mission/${craft.id}`);
    return null;
  }

  const stats = computeStats(craft.partIds);
  const mission = MISSION_PROFILES.find((m) => m.id === missionId)!;
  const canFly = stats.launchReady && stats.deltaVms >= mission.minDeltaV;

  function onLaunch() {
    setError(null);
    if (!canFly) {
      setError(
        `Need at least ${formatDeltaV(mission.minDeltaV)} Δv for ${mission.name}.`
      );
      return;
    }
    setLaunching(true);
    const next = launchCraft(craft!.id, missionId);
    if (!next) {
      setError("Launch failed — check design requirements.");
      setLaunching(false);
      return;
    }
    router.push(`/mission/${next.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,_#164e6366,_transparent_40%),radial-gradient(circle_at_80%_80%,_#1e3a8a44,_transparent_40%)]" />

      <div className="relative mx-auto max-w-3xl px-4 py-10">
        <Link
          href={`/design/${craft.id}`}
          className="text-sm text-slate-400 hover:text-cyan-300"
        >
          ← Back to design
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Launch {craft.name}
        </h1>
        <p className="mt-2 text-slate-400">
          Available Δv:{" "}
          <span className="font-semibold text-cyan-300">
            {formatDeltaV(stats.deltaVms)}
          </span>
          . Pick a mission profile.
        </p>

        <div className="mt-8 space-y-3">
          {MISSION_PROFILES.map((m) => {
            const ok = stats.deltaVms >= m.minDeltaV;
            const selected = missionId === m.id;
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
                    <div className="font-semibold text-white">{m.name}</div>
                    <p className="mt-1 text-sm text-slate-400">
                      {m.description}
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

        {error && (
          <p className="mt-4 text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!canFly || launching}
          onClick={onLaunch}
          className="mt-8 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-center text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none"
        >
          {launching
            ? "Ignition…"
            : canFly
              ? `Launch — ${mission.name}`
              : "Insufficient Δv or incomplete design"}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Alpha uses simplified patched orbits. Your craft persists in this
          browser and can be shared via a mission link.
        </p>
      </div>
    </div>
  );
}

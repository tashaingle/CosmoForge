"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LAUNCH_PRESETS,
  pickRecommendedPreset,
  presetIsReady,
  quickLaunch,
  type PresetId,
} from "@/lib/quick-launch";
import { formatDeltaV } from "@/lib/ship";
import type { SyncContext } from "@/lib/storage";
import { MISSION_PROFILES } from "@/lib/orbital";
import { getActiveSkyEvents } from "@/lib/sky-events";
import { getPersonality } from "@/lib/probe-personality";
import { voyageDurationMs } from "@/lib/probe-voyage";
import { isPresetUnlocked, unlockHint } from "@/lib/probe-unlocks";
import { loadCollection } from "@/lib/probe-loot";
import { unlockedPresetCount } from "./unlock-stats";

const ACCENT: Record<
  string,
  { border: string; bg: string; btn: string; tag: string }
> = {
  emerald: {
    border: "border-emerald-400/30",
    bg: "bg-emerald-500/10",
    btn: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
    tag: "text-emerald-300",
  },
  cyan: {
    border: "border-cyan-400/30",
    bg: "bg-cyan-500/10",
    btn: "bg-cyan-500 hover:bg-cyan-400 text-slate-950",
    tag: "text-cyan-300",
  },
  violet: {
    border: "border-violet-400/30",
    bg: "bg-violet-500/10",
    btn: "bg-violet-500 hover:bg-violet-400 text-slate-950",
    tag: "text-violet-300",
  },
  amber: {
    border: "border-amber-400/30",
    bg: "bg-amber-500/10",
    btn: "bg-amber-500 hover:bg-amber-400 text-slate-950",
    tag: "text-amber-300",
  },
  rose: {
    border: "border-rose-400/30",
    bg: "bg-rose-500/10",
    btn: "bg-rose-500 hover:bg-rose-400 text-slate-950",
    tag: "text-rose-300",
  },
  fuchsia: {
    border: "border-fuchsia-400/30",
    bg: "bg-fuchsia-500/10",
    btn: "bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950",
    tag: "text-fuchsia-300",
  },
};

interface Props {
  syncContext: SyncContext;
  hasInflight: boolean;
  compact?: boolean;
}

export function QuickLaunchPanel({
  syncContext,
  hasInflight,
  compact = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<PresetId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [absurd, setAbsurd] = useState(false);

  const collection = useMemo(() => {
    void tick;
    return loadCollection();
  }, [tick]);

  const recommended = useMemo(
    () => pickRecommendedPreset(hasInflight),
    [hasInflight, tick]
  );
  const active = useMemo(() => getActiveSkyEvents(), []);
  const unlockStats = useMemo(() => unlockedPresetCount(collection), [collection]);

  async function onLaunch(id: PresetId) {
    setError(null);
    if (!isPresetUnlocked(id, collection)) {
      setError(unlockHint(id) ?? "Locked");
      return;
    }
    setBusy(id);
    try {
      const res = quickLaunch(id, syncContext, { absurd });
      if (!res.ok || !res.craft) {
        setError(res.error ?? "Launch failed");
        setBusy(null);
        return;
      }
      setTick((t) => t + 1);
      router.push(`/mission/${res.craft.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Launch failed");
      setBusy(null);
    }
  }

  const recAccent = ACCENT[recommended.accent] ?? ACCENT.cyan;
  const recCheck = presetIsReady(recommended);
  const recMission = MISSION_PROFILES.find(
    (m) => m.id === recommended.missionId
  );

  const free = LAUNCH_PRESETS.filter((p) =>
    ["leo_scout", "lunar_courier", "mars_probe"].includes(p.id)
  );
  const unlockable = LAUNCH_PRESETS.filter(
    (p) => !["leo_scout", "lunar_courier", "mars_probe"].includes(p.id)
  );

  return (
    <section id="launch" className="space-y-4">
      {compact && (
        <div
          className={`rounded-2xl border ${recAccent.border} ${recAccent.bg} p-4 sm:p-5`}
        >
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${recAccent.tag}`}
          >
            Send a weirdo
            {active[0] ? ` · ${active[0].name}` : ""}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
            {recommended.label}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-300">
            {recommended.blurb}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {getPersonality(recommended.personalityId).label} ·{" "}
            {recMission?.name} · ~
            {Math.round(voyageDurationMs(recommended.missionId) / 60000)}m away
            · {formatDeltaV(recCheck.deltaVms)} Δv
          </p>
          <div className="mt-4">
            <button
              type="button"
              disabled={!recCheck.ok || busy !== null}
              onClick={() => void onLaunch(recommended.id)}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg disabled:cursor-not-allowed disabled:opacity-50 ${recAccent.btn}`}
            >
              {busy === recommended.id
                ? "Ignition…"
                : `Launch ${recommended.flavorTitle}`}
            </button>
          </div>
        </div>
      )}

      <div id="presets" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {compact ? "Or pick an odd job" : "Personality launches"}
            </h2>
            <p className="text-sm text-slate-400">
              {unlockStats.unlocked}/{unlockStats.total} flavors unlocked · bring
              back finds to open more
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            <input
              type="checkbox"
              checked={absurd}
              onChange={(e) => setAbsurd(e.target.checked)}
              className="rounded border-rose-400/40"
            />
            Deliberately bad launch
          </label>
        </div>
        {absurd && (
          <p className="text-xs text-rose-300/90">
            Under-equipped chaos mode. High chance of last messages. High chance
            of comedy. Occasionally cursed loot.
          </p>
        )}

        <PresetGrid
          presets={free}
          recommendedId={recommended.id}
          busy={busy}
          collectionTick={tick}
          onLaunch={onLaunch}
        />

        {unlockable.length > 0 && (
          <>
            <h3 className="pt-2 text-sm font-semibold text-violet-200">
              Unlocked by finds
            </h3>
            <PresetGrid
              presets={unlockable}
              recommendedId={recommended.id}
              busy={busy}
              collectionTick={tick}
              onLaunch={onLaunch}
              showLocks
            />
          </>
        )}
      </div>
      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function PresetGrid({
  presets,
  recommendedId,
  busy,
  onLaunch,
  showLocks = false,
  collectionTick,
}: {
  presets: typeof LAUNCH_PRESETS;
  recommendedId: PresetId;
  busy: PresetId | null;
  onLaunch: (id: PresetId) => void;
  showLocks?: boolean;
  collectionTick: number;
}) {
  void collectionTick;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {presets.map((p) => {
        const a = ACCENT[p.accent] ?? ACCENT.cyan;
        const unlocked = isPresetUnlocked(p.id);
        const check = unlocked
          ? presetIsReady(p)
          : { ok: false, deltaVms: 0, minDeltaV: 0 };
        const mission = MISSION_PROFILES.find((m) => m.id === p.missionId);
        const isRec = p.id === recommendedId;
        const pers = getPersonality(p.personalityId);
        const hint = unlockHint(p.id);

        return (
          <div
            key={p.id}
            className={`flex flex-col rounded-2xl border p-4 ${
              unlocked ? a.border : "border-white/10"
            } ${unlocked ? "bg-slate-900/60" : "bg-slate-950/80 opacity-90"} ${
              isRec && unlocked ? "ring-1 ring-cyan-400/40" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white">{p.label}</h3>
              {!unlocked && showLocks && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                  Locked
                </span>
              )}
              {isRec && unlocked && (
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-200">
                  Today
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
              {pers.label}
            </p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-400">
              {unlocked ? p.blurb : hint}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              {mission?.name} · ~
              {Math.round(voyageDurationMs(p.missionId) / 60000)}m
              {unlocked ? ` · ${formatDeltaV(check.deltaVms)}` : ""}
            </p>
            <button
              type="button"
              disabled={!unlocked || !check.ok || busy !== null}
              onClick={() => void onLaunch(p.id)}
              className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                unlocked ? a.btn : "bg-white/10 text-slate-400"
              }`}
            >
              {!unlocked
                ? "Locked"
                : busy === p.id
                  ? "Ignition…"
                  : "Send them"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

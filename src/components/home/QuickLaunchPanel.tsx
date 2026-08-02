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
};

interface Props {
  syncContext: SyncContext;
  hasInflight: boolean;
  /** Compact single recommended CTA */
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

  const recommended = useMemo(
    () => pickRecommendedPreset(hasInflight),
    [hasInflight]
  );
  const active = useMemo(() => getActiveSkyEvents(), []);

  async function onLaunch(id: PresetId) {
    setError(null);
    setBusy(id);
    try {
      const res = quickLaunch(id, syncContext);
      if (!res.ok || !res.craft) {
        setError(res.error ?? "Launch failed");
        setBusy(null);
        return;
      }
      router.push(`/mission/${res.craft.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Launch failed");
      setBusy(null);
    }
  }

  const recAccent = ACCENT[recommended.accent];
  const recCheck = presetIsReady(recommended);
  const recMission = MISSION_PROFILES.find(
    (m) => m.id === recommended.missionId
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
            One-tap launch
            {active[0] ? ` · ${active[0].name}` : ""}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
            {recommended.label}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-300">
            {recommended.blurb}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {recMission?.name} · {formatDeltaV(recCheck.deltaVms)} Δv ready · no
            design required
          </p>
          <div className="mt-4">
            <button
              type="button"
              disabled={!recCheck.ok || busy !== null}
              onClick={() => void onLaunch(recommended.id)}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg disabled:cursor-not-allowed disabled:opacity-50 ${recAccent.btn}`}
            >
              {busy === recommended.id
                ? "Launching…"
                : `Launch ${recommended.label}`}
            </button>
          </div>
        </div>
      )}

      <div id="presets" className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {compact ? "Or pick a destination" : "Quick launch"}
          </h2>
          <p className="text-sm text-slate-400">
            Preset craft — design later if you want to tinker.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {LAUNCH_PRESETS.map((p) => {
            const a = ACCENT[p.accent];
            const check = presetIsReady(p);
            const mission = MISSION_PROFILES.find((m) => m.id === p.missionId);
            const isRec = p.id === recommended.id;
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-2xl border p-4 ${a.border} bg-slate-900/60 ${
                  isRec ? "ring-1 ring-cyan-400/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{p.label}</h3>
                  {isRec && (
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-200">
                      Today
                    </span>
                  )}
                </div>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-400">
                  {p.blurb}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  {mission?.name} · {formatDeltaV(check.deltaVms)}
                </p>
                <button
                  type="button"
                  disabled={!check.ok || busy !== null}
                  onClick={() => void onLaunch(p.id)}
                  className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${a.btn}`}
                >
                  {busy === p.id ? "Launching…" : "Launch now"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

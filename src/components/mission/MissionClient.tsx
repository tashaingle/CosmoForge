"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SolarSystemCanvas } from "@/components/space/SolarSystemCanvas";
import { useAuth } from "@/components/auth/AuthProvider";
import { TIME_SCALES, type PlanetId } from "@/lib/constants";
import {
  formatDistanceAU,
  heliocentricDistanceAU,
  MISSION_PROFILES,
  periodDays,
} from "@/lib/orbital";
import { computeStats, formatDeltaV, formatMass } from "@/lib/ship";
import { encodeShare, touchCraftSim, upsertCraft } from "@/lib/storage";
import { fetchLiveCrafts } from "@/lib/cloud-fleet";
import type { Craft, LiveCraftMarker } from "@/lib/types";
import { InlineSpinner } from "@/components/ui/LoadingScreen";
import { claimLaunchReward } from "@/lib/economy";
import { getActiveSkyEvents } from "@/lib/sky-events";
import { getSkin } from "@/lib/cosmetics";

type Focus = "system" | "craft" | PlanetId;

interface Props {
  craft: Craft;
  readOnly?: boolean;
}

export function MissionClient({ craft, readOnly = false }: Props) {
  const { syncContext, configured, persistWallet, wallet } = useAuth();
  const launchMs = craft.launchedAt ?? Date.now();
  const [simMs, setSimMs] = useState(
    () => craft.lastSimMs ?? craft.launchedAt ?? Date.now()
  );
  const [timeScale, setTimeScale] = useState(1000);
  const [paused, setPaused] = useState(false);
  const [focus, setFocus] = useState<Focus>("craft");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [others, setOthers] = useState<LiveCraftMarker[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const activeEvents = useMemo(() => getActiveSkyEvents(), []);
  const skin = getSkin(craft.skinId || wallet.equippedSkinId);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setSimMs((s) => s + dt * 1000 * timeScale);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, timeScale]);

  useEffect(() => {
    if (readOnly || craft.status !== "inflight") return;
    const id = window.setInterval(() => {
      touchCraftSim(craft.id, simMs, syncContext);
    }, 5000);
    return () => clearInterval(id);
  }, [craft.id, craft.status, readOnly, simMs, syncContext]);

  // Multiplayer: load other inflight craft
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    async function load() {
      setLiveLoading(true);
      try {
        const list = await fetchLiveCrafts(craft.id);
        if (!cancelled) setOthers(list);
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    }
    void load();
    const id = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [configured, craft.id]);

  // Claim launch credits once
  useEffect(() => {
    if (readOnly || !craft.missionId || craft.status !== "inflight") return;
    // Ensure skin on craft for map
    if (!craft.skinId && wallet.equippedSkinId) {
      upsertCraft(
        { ...craft, skinId: wallet.equippedSkinId },
        syncContext
      );
    }
    const result = claimLaunchReward(craft.id, craft.missionId);
    void persistWallet(result.wallet);
    if (!result.alreadyClaimed && result.gained > 0) {
      setRewardToast(`+✦ ${result.gained} credits for launch`);
      const t = window.setTimeout(() => setRewardToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [craft.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => computeStats(craft.partIds), [craft.partIds]);
  const mission = MISSION_PROFILES.find((m) => m.id === craft.missionId);
  const orbit = craft.orbit;

  const distanceAU = orbit ? heliocentricDistanceAU(orbit, simMs) : 0;
  const missionDays = (simMs - launchMs) / (86400 * 1000);
  const orbitPeriod = orbit ? periodDays(orbit) : 0;

  const onShare = useCallback(async () => {
    const snapshot = { ...craft, lastSimMs: simMs };
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ craft: snapshot }),
      });
      if (res.ok) {
        const body = (await res.json()) as { path: string };
        const url = `${window.location.origin}${body.path}`;
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch {
      // fall through
    }

    const token = encodeShare(snapshot);
    const url = `${window.location.origin}/share/${token}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [craft, simMs]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-slate-950 text-slate-100">
      <div className="absolute inset-0">
        <SolarSystemCanvas
          simMs={simMs}
          craftOrbit={orbit}
          craftName={craft.name}
          craftSkinId={craft.skinId || skin.id}
          focus={focus}
          otherCrafts={others}
          className="h-full w-full"
        />
      </div>

      {rewardToast && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-100 shadow-lg backdrop-blur">
          {rewardToast}
        </div>
      )}

      {activeEvents.length > 0 && !readOnly && (
        <div className="absolute left-2 right-2 top-14 z-10 sm:left-auto sm:right-4 sm:top-16 sm:max-w-xs">
          <div className="rounded-xl border border-emerald-400/30 bg-slate-950/80 px-3 py-2 text-[11px] text-emerald-100 backdrop-blur sm:text-xs">
            <span className="font-semibold text-emerald-300">Sky event</span>
            <span className="mt-0.5 block truncate">
              {activeEvents.map((e) => e.name).join(" · ")}
            </span>
          </div>
        </div>
      )}

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/75 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {!readOnly && (
            <Link
              href="/#hangar"
              className="shrink-0 text-sm text-slate-400 transition hover:text-cyan-300"
            >
              ← Hangar
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
              {craft.name}
            </h1>
            <p className="truncate text-[11px] text-slate-400 sm:text-xs">
              {mission?.name ?? "Mission"} ·{" "}
              {orbit?.centralBody === "earth" ? "Geocentric" : "Heliocentric"}
              {readOnly ? " · Shared" : ""}
              {others.length > 0 ? ` · ${others.length} others in space` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {liveLoading && <InlineSpinner />}
          {!readOnly && (
            <button
              type="button"
              onClick={() => void onShare()}
              className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 sm:px-3 sm:text-sm"
            >
              {copied ? "Copied" : "Share"}
            </button>
          )}
        </div>
      </header>

      <div className="relative z-10 m-2 max-w-[min(100%,20rem)] space-y-2 sm:m-4 sm:max-w-xs sm:space-y-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3 backdrop-blur-md sm:p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300 sm:text-xs">
            Telemetry
          </h2>
          <dl className="mt-2 space-y-1.5 text-xs sm:mt-3 sm:space-y-2 sm:text-sm">
            <Row label="Mission time" value={`${missionDays.toFixed(2)} d`} />
            <Row label="Heliocentric r" value={formatDistanceAU(distanceAU)} />
            <Row
              label="Orbit period"
              value={
                orbitPeriod < 2
                  ? `${(orbitPeriod * 24).toFixed(1)} h`
                  : `${orbitPeriod.toFixed(1)} d`
              }
            />
            <Row label="Ship Δv" value={formatDeltaV(stats.deltaVms)} />
            <Row label="Wet mass" value={formatMass(stats.wetMassKg)} />
          </dl>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3 backdrop-blur-md sm:p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300 sm:text-xs">
            Camera
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(
              [
                ["craft", "Craft"],
                ["system", "System"],
                ["earth", "Earth"],
                ["mars", "Mars"],
                ["jupiter", "Jupiter"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFocus(id as Focus)}
                className={`rounded-md px-2 py-1 text-[11px] sm:text-xs ${
                  focus === id
                    ? "bg-cyan-500/30 text-cyan-100"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {others.length > 0 && (
          <div className="hidden rounded-2xl border border-violet-400/20 bg-slate-950/80 p-3 backdrop-blur-md sm:block sm:p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-violet-300 sm:text-xs">
              Traffic ({others.length})
            </h2>
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-slate-300">
              {others.slice(0, 12).map((o) => (
                <li key={o.id} className="truncate">
                  <span className="text-violet-200">{o.name}</span>
                  <span className="text-slate-500"> · {o.commanderName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-auto border-t border-white/10 bg-slate-950/85 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15 sm:text-sm"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => setSimMs(launchMs)}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 sm:text-sm"
            >
              Reset
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] text-slate-500 sm:text-xs">
              Time
            </span>
            {TIME_SCALES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTimeScale(t.value)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium sm:px-2.5 sm:text-xs ${
                  timeScale === t.value
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="hidden text-xs text-slate-500 md:block">
            Drag · zoom · other players appear as colored markers
          </p>
        </div>
        {shareUrl && (
          <p className="mx-auto mt-2 max-w-4xl truncate text-[11px] text-cyan-300/80 sm:text-xs">
            Share: {shareUrl}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-100">{value}</dd>
    </div>
  );
}

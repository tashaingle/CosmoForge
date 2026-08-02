"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SolarSystemCanvas } from "@/components/space/SolarSystemCanvas";
import { useAuth } from "@/components/auth/AuthProvider";
import { TIME_SCALES } from "@/lib/constants";
import type { BodyId } from "@/lib/bodies";
import { PASSPORT_BODIES, bodyPositionAU, getBody } from "@/lib/bodies";
import {
  craftScenePosition,
  formatDistanceAU,
  heliocentricDistanceAU,
  MISSION_PROFILES,
  periodDays,
} from "@/lib/orbital";
import { computeStats, formatDeltaV, formatMass } from "@/lib/ship";
import { touchCraftSim, upsertCraft } from "@/lib/storage";
import { shareCraftMission } from "@/lib/share-craft";
import { fetchLiveCrafts } from "@/lib/cloud-fleet";
import type { Craft, LiveCraftMarker } from "@/lib/types";
import { InlineSpinner } from "@/components/ui/LoadingScreen";
import {
  claimLaunchReward,
  claimObjectiveReward,
  loadWallet,
} from "@/lib/economy";
import { getActiveSkyEvents } from "@/lib/sky-events";
import { getSkin } from "@/lib/cosmetics";
import {
  canScan,
  getMissionBriefing,
  loadObjectiveState,
  performScan,
  saveObjectiveState,
  type CraftObjectiveState,
  type ObjectiveContext,
} from "@/lib/mission-objectives";
import {
  discoverBody,
  discoveryRewardCredits,
} from "@/lib/passport";
import { EphemerisBadge } from "@/components/ephemeris/EphemerisBadge";

type Focus = "system" | "craft" | BodyId;

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
  // Open on the craft so the first thing you see is YOUR ship, not empty void
  const [focus, setFocus] = useState<Focus>("craft");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [others, setOthers] = useState<LiveCraftMarker[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const [objState, setObjState] = useState<CraftObjectiveState>(() =>
    loadObjectiveState(craft.id)
  );
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

  useEffect(() => {
    if (readOnly || !craft.missionId || craft.status !== "inflight") return;
    if (!craft.skinId && wallet.equippedSkinId) {
      upsertCraft(
        { ...craft, skinId: wallet.equippedSkinId },
        syncContext
      );
    }
    const result = claimLaunchReward(craft.id, craft.missionId);
    void persistWallet(result.wallet);
    if (!result.alreadyClaimed && result.gained > 0) {
      setRewardToast(`+✦ ${result.gained} for launch — now chase objectives`);
      const t = window.setTimeout(() => setRewardToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [craft.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => computeStats(craft.partIds), [craft.partIds]);
  const mission = MISSION_PROFILES.find((m) => m.id === craft.missionId);
  const orbit = craft.orbit;
  const briefing = useMemo(
    () => getMissionBriefing(craft.missionId),
    [craft.missionId]
  );

  const ctx: ObjectiveContext | null = useMemo(() => {
    if (!orbit || !craft.missionId) return null;
    return {
      missionId: craft.missionId,
      orbit,
      simMs,
      launchMs,
      scanCount: objState.scanCount,
    };
  }, [orbit, craft.missionId, simMs, launchMs, objState.scanCount]);

  // Auto-detect newly completed objectives and pay rewards
  useEffect(() => {
    if (readOnly || !ctx) return;
    let state = loadObjectiveState(craft.id);
    let gainedTotal = 0;
    let lastTitle = "";
    for (const o of briefing.objectives) {
      if (state.completedIds.includes(o.id)) continue;
      if (o.complete(ctx)) {
        state = {
          ...state,
          completedIds: [...state.completedIds, o.id],
        };
        const pay = claimObjectiveReward(craft.id, o.id, o.rewardCredits);
        void persistWallet(pay.wallet);
        if (!pay.alreadyClaimed) {
          gainedTotal += pay.gained;
          lastTitle = o.title;
        }
      }
    }
    if (gainedTotal > 0) {
      saveObjectiveState(craft.id, state);
      setObjState(state);
      setRewardToast(`Goal complete: ${lastTitle} · +✦ ${gainedTotal}`);
      const t = window.setTimeout(() => setRewardToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [ctx, briefing.objectives, craft.id, readOnly, persistWallet]);

  // Solar passport: stamp bodies when craft flies near them
  useEffect(() => {
    if (readOnly || !orbit) return;
    const craftPos = craftScenePosition(orbit, simMs);
    for (const body of PASSPORT_BODIES) {
      const bp = bodyPositionAU(body.id, simMs);
      const dx = craftPos.x - bp.x;
      const dy = craftPos.y - bp.y;
      const dz = craftPos.z - bp.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // Threshold: larger for outer planets, tighter for moons (visual scale)
      const thresh =
        body.kind === "moon"
          ? (body.visualOrbitAu ?? 0.08) * 1.4
          : Math.max(0.12, body.a * 0.08);
      if (d < thresh) {
        const { isNew } = discoverBody(body.id);
        if (isNew) {
          const bonus = discoveryRewardCredits(body.id);
          const w = loadWallet();
          w.credits += bonus;
          void persistWallet(w);
          setRewardToast(
            `Passport: ${body.name} stamped · +✦ ${bonus}`
          );
          window.setTimeout(() => setRewardToast(null), 5000);
        }
      }
    }
  }, [simMs, orbit, readOnly, persistWallet]);

  const distanceAU = orbit ? heliocentricDistanceAU(orbit, simMs) : 0;
  const missionDaysVal = (simMs - launchMs) / (86400 * 1000);
  const orbitPeriod = orbit ? periodDays(orbit) : 0;
  const scanReady = canScan(objState, simMs);

  const onScan = () => {
    if (readOnly) return;
    const res = performScan(craft.id, simMs);
    setObjState(res.state);
    setRewardToast(res.message);
    window.setTimeout(() => setRewardToast(null), 3000);
  };

  const onShare = useCallback(async () => {
    const { url, copied } = await shareCraftMission(
      { ...craft, lastSimMs: simMs },
      simMs
    );
    setShareUrl(url);
    setCopied(copied);
    if (copied) setTimeout(() => setCopied(false), 2000);
  }, [craft, simMs]);

  const doneCount = briefing.objectives.filter((o) =>
    objState.completedIds.includes(o.id)
  ).length;

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-slate-950 text-slate-100">
      {/* 3D view fills the screen; UI is overlaid so the page never scrolls */}
      <div className="absolute inset-0 z-0">
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
        <div className="pointer-events-none absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-100 shadow-lg backdrop-blur">
          {rewardToast}
        </div>
      )}

      <header className="absolute left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/80 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {!readOnly && (
            <Link
              href="/#fleet"
              className="shrink-0 text-sm text-slate-400 transition hover:text-cyan-300"
            >
              ← Fleet
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
              {craft.name}
            </h1>
            <p className="truncate text-[11px] text-slate-400 sm:text-xs">
              {mission?.name ?? "Mission"} · Goals {doneCount}/
              {briefing.objectives.length}
              {focus === "craft"
                ? " · tracking craft"
                : focus === "system"
                  ? " · free look"
                  : ` · looking at ${getBody(focus)?.name ?? focus}`}
              {others.length > 0 ? ` · ${others.length} others` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EphemerisBadge compact />
          {liveLoading && <InlineSpinner />}
          {!readOnly && (
            <>
              <button
                type="button"
                disabled={!scanReady}
                onClick={onScan}
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                title="Log science — advances scan objectives"
              >
                Science scan
              </button>
              <button
                type="button"
                onClick={() => void onShare()}
                className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 sm:px-3 sm:text-sm"
              >
                {copied ? "Copied" : "Share"}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Sidebar scrolls on its own; never pushes the time-warp bar off-screen */}
      <div className="absolute bottom-[5.75rem] left-2 top-14 z-20 flex w-[min(calc(100%-1rem),22rem)] flex-col gap-2 overflow-y-auto overscroll-contain sm:bottom-24 sm:left-4 sm:top-16 sm:w-sm sm:gap-3">
        {/* Purpose — the thing that was missing */}
        <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-cyan-950/80 to-slate-950/90 p-3 backdrop-blur-md sm:p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300 sm:text-xs">
            Your mission
          </h2>
          <p className="mt-1.5 text-sm font-medium leading-snug text-white">
            {briefing.purpose}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            <span className="text-slate-300">Win: </span>
            {briefing.winCondition}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {briefing.howTo}
          </p>
        </div>

        {/* Objectives checklist */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/85 p-3 backdrop-blur-md sm:p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-amber-200 sm:text-xs">
            Objectives · earn credits
          </h2>
          <ul className="mt-3 space-y-3">
            {briefing.objectives.map((o) => {
              const prog = ctx ? o.progress(ctx) : 0;
              const done = objState.completedIds.includes(o.id) || prog >= 1;
              return (
                <li key={o.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          done ? "text-emerald-300" : "text-slate-100"
                        }`}
                      >
                        {done ? "✓ " : ""}
                        {o.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                        {o.why}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-amber-200/90">
                      +✦ {o.rewardCredits}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all ${
                        done ? "bg-emerald-400" : "bg-cyan-400"
                      }`}
                      style={{ width: `${Math.round(prog * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {doneCount === briefing.objectives.length && (
            <p className="mt-3 text-xs font-medium text-emerald-300">
              Mission goals complete — design a bigger ship or chase a sky
              event.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3 backdrop-blur-md sm:p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300 sm:text-xs">
            Telemetry
          </h2>
          <dl className="mt-2 space-y-1.5 text-xs sm:text-sm">
            <Row label="Mission time" value={`${missionDaysVal.toFixed(2)} d`} />
            <Row label="Heliocentric r" value={formatDistanceAU(distanceAU)} />
            <Row
              label="Orbit period"
              value={
                orbitPeriod < 2
                  ? `${(orbitPeriod * 24).toFixed(1)} h`
                  : `${orbitPeriod.toFixed(1)} d`
              }
            />
            <Row label="Scans logged" value={String(objState.scanCount)} />
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
                ["system", "Free look"],
                ["craft", "Craft"],
                ["earth", "Earth"],
                ["moon", "Moon"],
                ["mars", "Mars"],
                ["jupiter", "Jupiter"],
                ["europa", "Europa"],
                ["saturn", "Saturn"],
                ["titan", "Titan"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  // Click active target again → free look (unselect)
                  setFocus(
                    focus === id && id !== "system"
                      ? "system"
                      : (id as Focus)
                  )
                }
                className={`rounded-md px-2 py-1 text-[11px] sm:text-xs ${
                  focus === id
                    ? "bg-cyan-500/30 text-cyan-100 ring-1 ring-cyan-400/40"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {focus === "system"
              ? "Free look — drag to orbit, scroll to zoom. Pick a world to jump there."
              : "Tracking target — drag/zoom freely. Click again or Free look to unlock."}
          </p>
          {focus !== "system" &&
            focus !== "craft" &&
            getBody(focus) && (
              <p className="mt-1 text-[11px] text-slate-600">
                {getBody(focus)!.blurb}
              </p>
            )}
        </div>

        {activeEvents.length > 0 && !readOnly && (
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
            <span className="font-semibold text-emerald-300">Sky event</span>
            <span className="mt-0.5 block">
              {activeEvents.map((e) => e.name).join(" · ")}
            </span>
          </div>
        )}

        {others.length > 0 && (
          <div className="rounded-2xl border border-violet-400/20 bg-slate-950/80 p-3 backdrop-blur-md sm:p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-violet-300 sm:text-xs">
              Traffic ({others.length})
            </h2>
            <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-slate-300">
              {others.slice(0, 8).map((o) => (
                <li key={o.id} className="truncate">
                  <span className="text-violet-200">{o.name}</span>
                  <span className="text-slate-500"> · {o.commanderName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Always pinned to the bottom of the viewport */}
      <div className="absolute inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="border-t border-cyan-400/25 bg-slate-950/95 px-3 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:px-4 sm:py-3.5">
          <div className="mx-auto flex max-w-5xl flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="rounded-lg border border-white/15 bg-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/25 sm:text-sm"
              >
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={() => setSimMs(launchMs)}
                className="rounded-lg border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-medium text-slate-100 hover:bg-white/15 sm:text-sm"
              >
                Reset
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300/90 sm:text-xs">
                Time warp
              </span>
              {TIME_SCALES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTimeScale(t.value)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold sm:px-3 sm:text-xs ${
                    timeScale === t.value
                      ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30"
                      : "border border-white/10 bg-slate-800/90 text-slate-100 hover:border-cyan-400/30 hover:bg-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="hidden text-xs text-slate-400 lg:block">
              Free look anytime · click a world twice to unlock
            </p>
          </div>
          {shareUrl && (
            <p className="mx-auto mt-2 max-w-5xl truncate text-[11px] text-cyan-300/90 sm:text-xs">
              Share: {shareUrl}
            </p>
          )}
        </div>
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

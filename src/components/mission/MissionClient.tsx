"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SolarSystemCanvas } from "@/components/space/SolarSystemCanvas";
import { TIME_SCALES, type PlanetId } from "@/lib/constants";
import {
  formatDistanceAU,
  heliocentricDistanceAU,
  MISSION_PROFILES,
  periodDays,
} from "@/lib/orbital";
import { computeStats, formatDeltaV, formatMass } from "@/lib/ship";
import { encodeShare, touchCraftSim } from "@/lib/storage";
import type { Craft } from "@/lib/types";

type Focus = "system" | "craft" | PlanetId;

interface Props {
  craft: Craft;
  readOnly?: boolean;
}

export function MissionClient({ craft, readOnly = false }: Props) {
  const launchMs = craft.launchedAt ?? Date.now();
  const [simMs, setSimMs] = useState(
    () => craft.lastSimMs ?? craft.launchedAt ?? Date.now()
  );
  const [timeScale, setTimeScale] = useState(1000);
  const [paused, setPaused] = useState(false);
  const [focus, setFocus] = useState<Focus>("craft");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Real-time wall clock → sim clock
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

  // Persist sim progress periodically (owner only)
  useEffect(() => {
    if (readOnly || craft.status !== "inflight") return;
    const id = window.setInterval(() => {
      touchCraftSim(craft.id, simMs);
    }, 5000);
    return () => clearInterval(id);
  }, [craft.id, craft.status, readOnly, simMs]);

  const stats = useMemo(() => computeStats(craft.partIds), [craft.partIds]);
  const mission = MISSION_PROFILES.find((m) => m.id === craft.missionId);
  const orbit = craft.orbit;

  const distanceAU = orbit ? heliocentricDistanceAU(orbit, simMs) : 0;
  const missionDays = (simMs - launchMs) / (86400 * 1000);
  const orbitPeriod = orbit ? periodDays(orbit) : 0;

  const onShare = useCallback(async () => {
    const snapshot = { ...craft, lastSimMs: simMs };
    // Prefer short Supabase-backed link when configured; fall back to URL snapshot
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
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <div className="absolute inset-0">
        <SolarSystemCanvas
          simMs={simMs}
          craftOrbit={orbit}
          craftName={craft.name}
          focus={focus}
          className="h-full w-full"
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {!readOnly && (
            <Link
              href="/"
              className="text-sm text-slate-400 transition hover:text-cyan-300"
            >
              ← Hangar
            </Link>
          )}
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              {craft.name}
            </h1>
            <p className="text-xs text-slate-400">
              {mission?.name ?? "Mission"} ·{" "}
              {orbit?.centralBody === "earth" ? "Geocentric" : "Heliocentric"}
              {readOnly ? " · Shared view" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={onShare}
              className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/20"
            >
              {copied ? "Link copied" : "Share mission"}
            </button>
          )}
        </div>
      </header>

      {/* HUD left */}
      <div className="relative z-10 m-4 max-w-xs space-y-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-4 backdrop-blur-md">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            Telemetry
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
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
            <Row label="Ship Δv (design)" value={formatDeltaV(stats.deltaVms)} />
            <Row label="Wet mass" value={formatMass(stats.wetMassKg)} />
          </dl>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/75 p-4 backdrop-blur-md">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
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
                className={`rounded-md px-2 py-1 text-xs ${
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
      </div>

      {/* Bottom time controls */}
      <div className="relative z-10 mt-auto border-t border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => setSimMs(launchMs)}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10"
            >
              Reset to launch
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs text-slate-500">Time scale</span>
            {TIME_SCALES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTimeScale(t.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  timeScale === t.value
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Drag to orbit · scroll to zoom · craft keeps flying when you leave
          </p>
        </div>
        {shareUrl && (
          <p className="mx-auto mt-2 max-w-4xl truncate text-xs text-cyan-300/80">
            Share: {shareUrl}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-100">{value}</dd>
    </div>
  );
}

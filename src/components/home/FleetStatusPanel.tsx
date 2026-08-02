"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { AwayCraftLine, AwayReport } from "@/lib/away-report";
import { shareCraftMission } from "@/lib/share-craft";
import { getCraft } from "@/lib/storage";

interface Props {
  report: AwayReport;
  onRefresh?: () => void;
}

export function AwayReportBanner({ report }: { report: AwayReport }) {
  if (!report.hasNews && !report.skyLine) return null;

  return (
    <section
      id="away"
      className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-950 p-4 sm:p-5"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
        While you were away
        {report.awayLabel ? ` · ${report.awayLabel}` : ""}
      </p>
      {report.skyLine && (
        <p className="mt-2 text-sm text-amber-50/90">
          Live sky: <span className="font-medium">{report.skyLine}</span>
        </p>
      )}
      {report.hasNews && report.lines.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {report.lines.map((line) => (
            <li
              key={line.craftId}
              className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-white">
                {line.name}{" "}
                <span className="font-normal text-slate-400">
                  · {line.missionName}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-amber-100/90">{line.headline}</p>
              <p className="mt-0.5 text-xs text-slate-500">{line.detail}</p>
            </li>
          ))}
        </ul>
      ) : (
        !report.hasNews &&
        report.skyLine && (
          <p className="mt-2 text-sm text-slate-400">
            Launch or check your fleet — event bonuses may be active.
          </p>
        )
      )}
    </section>
  );
}

function FleetCard({ line }: { line: AwayCraftLine }) {
  const [shareState, setShareState] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const onShare = useCallback(async () => {
    setSharing(true);
    setShareState(null);
    try {
      const craft = getCraft(line.craftId);
      if (!craft || craft.status !== "inflight") {
        setShareState("Craft not found");
        return;
      }
      const { url, copied } = await shareCraftMission(craft, line.simMs);
      setShareState(copied ? "Link copied" : url);
    } catch {
      setShareState("Share failed");
    } finally {
      setSharing(false);
    }
  }, [line.craftId, line.simMs]);

  const pct =
    line.goalsTotal > 0
      ? Math.round((line.goalsDone / line.goalsTotal) * 100)
      : 0;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <h3 className="truncate text-lg font-medium text-white">{line.name}</h3>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
            In flight
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-300">
            {line.missionName}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-slate-300">{line.headline}</p>
        <p className="mt-0.5 text-xs text-slate-500">{line.detail}</p>
        <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        {line.nextTitle && (
          <p className="mt-1.5 text-xs text-slate-400">
            Next: <span className="text-amber-100">{line.nextTitle}</span>
          </p>
        )}
        {shareState && (
          <p className="mt-1.5 truncate text-xs text-cyan-300/90" title={shareState}>
            {shareState.startsWith("http") ? (
              <a href={shareState} className="underline">
                {shareState}
              </a>
            ) : (
              shareState
            )}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={line.href}
          className="rounded-xl bg-cyan-500 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Command
        </Link>
        <button
          type="button"
          disabled={sharing}
          onClick={() => void onShare()}
          className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {sharing ? "…" : "Share"}
        </button>
      </div>
    </li>
  );
}

export function FleetStatusPanel({ report, onRefresh }: Props) {
  return (
    <section id="fleet" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Your fleet in the system
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Persistent craft in today’s solar system — they fly while you’re
            offline.
          </p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-slate-400 hover:text-cyan-300"
          >
            Refresh
          </button>
        )}
      </div>

      {report.lines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-6 py-10 text-center">
          <p className="text-slate-400">
            {report.emptyHint ??
              "Nothing in flight. Launch a preset — your probe keeps flying."}
          </p>
          <a
            href="#launch"
            className="mt-3 inline-block text-sm font-medium text-cyan-400 hover:underline"
          >
            One-tap launch →
          </a>
        </div>
      ) : (
        <ul className="space-y-3">
          {report.lines.map((line) => (
            <FleetCard key={line.craftId} line={line} />
          ))}
        </ul>
      )}
    </section>
  );
}

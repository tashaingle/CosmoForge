"use client";

import {
  eventKindLabel,
  formatEventWindow,
  getActiveSkyEvents,
  getUpcomingSkyEvents,
} from "@/lib/sky-events";

export function SkyEventsPanel() {
  const active = getActiveSkyEvents();
  const upcoming = getUpcomingSkyEvents(Date.now(), 4).filter(
    (e) => !active.some((a) => a.id === e.id && a.startMs === e.startMs)
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <h3 className="text-lg font-semibold text-white">Sky events</h3>
      <p className="mt-1 text-sm text-slate-400">
        Real calendar windows boost rewards and unlock limited missions &amp;
        cosmetics.
      </p>

      <div className="mt-4 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          Active now
        </h4>
        {active.length === 0 ? (
          <p className="text-sm text-slate-500">
            No major event window open — check upcoming.
          </p>
        ) : (
          active.map((e) => (
            <article
              key={`${e.id}-${e.startMs}`}
              className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h5 className="font-medium text-emerald-100">{e.name}</h5>
                <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] uppercase text-emerald-200/80">
                  {eventKindLabel(e.kind)}
                </span>
                <span className="text-xs tabular-nums text-amber-200">
                  ×{e.rewardMultiplier} · +{e.bonusCredits} cr
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {e.blurb}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatEventWindow(e)}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="mt-5 space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Upcoming
        </h4>
        {upcoming.map((e) => (
          <div
            key={`${e.id}-${e.startMs}`}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
          >
            <span className="text-slate-200">{e.name}</span>
            <span className="text-xs text-slate-500">
              {formatEventWindow(e)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

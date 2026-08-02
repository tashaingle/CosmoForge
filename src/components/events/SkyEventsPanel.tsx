"use client";

import { useEffect, useState } from "react";
import {
  eventKindLabel,
  formatEventWindow,
  getActiveSkyEvents,
  getUpcomingSkyEvents,
} from "@/lib/sky-events";
import type { LiveFeedItem, SkyFeedResponse } from "@/lib/jpl-feed";
import { liveRewardBoost, prepareFeedForDisplay } from "@/lib/jpl-feed";
import { setLiveRewardBoost } from "@/lib/economy";
import { InlineSpinner } from "@/components/ui/LoadingScreen";

export function SkyEventsPanel() {
  const catalogActive = getActiveSkyEvents();
  const upcoming = getUpcomingSkyEvents(Date.now(), 4).filter(
    (e) =>
      !catalogActive.some((a) => a.id === e.id && a.startMs === e.startMs)
  );

  const [feed, setFeed] = useState<SkyFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/sky-feed");
        if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
        const body = (await res.json()) as SkyFeedResponse;
        if (cancelled) return;
        setFeed(body);
        const boost = liveRewardBoost(body.items);
        setLiveRewardBoost(
          boost.multiplier > 1
            ? boost
            : { multiplier: 1, bonusCredits: 0, labels: [] }
        );
        if (body.sources.errors?.length) {
          setErr(body.sources.errors.join(" · "));
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Feed unavailable");
          setLiveRewardBoost(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const prepared = feed
    ? prepareFeedForDisplay(feed.items)
    : { active: [] as LiveFeedItem[], upcoming: [] as LiveFeedItem[] };
  const liveActive = prepared.summary
    ? [
        ...prepared.active.filter((a) => a.kind !== "cme"),
        prepared.summary,
      ]
    : prepared.active;
  const liveUpcoming = prepared.upcoming;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">Sky events</h3>
          <p className="mt-1 text-sm text-slate-400">
            Catalog windows plus live JPL NEO approaches &amp; NASA DONKI solar
            activity.
          </p>
        </div>
        {loading ? (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <InlineSpinner /> Live feed
          </span>
        ) : (
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
            {feed?.sources.jplCad || feed?.sources.nasaDonki
              ? "Live feed on"
              : "Catalog only"}
          </span>
        )}
      </div>

      {err && (
        <p className="mt-2 text-xs text-amber-300/90">
          Feed note: {err} (catalog still works)
        </p>
      )}

      {/* Live JPL / DONKI */}
      <div className="mt-4 space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
          Live from JPL / NASA
        </h4>
        {loading && (
          <p className="text-sm text-slate-500">Fetching CAD + DONKI…</p>
        )}
        {!loading && liveActive.length === 0 && liveUpcoming.length === 0 && (
          <p className="text-sm text-slate-500">
            No close approaches or solar alerts in the pull window.
          </p>
        )}
        {liveActive.map((item) => (
          <LiveCard key={item.id} item={item} badge="Active" />
        ))}
        {liveUpcoming.slice(0, 5).map((item) => (
          <LiveCard key={item.id} item={item} badge="Upcoming" muted />
        ))}
        {feed?.fetchedAt && (
          <p className="text-[10px] text-slate-600">
            Feed cached · updated{" "}
            {new Date(feed.fetchedAt).toLocaleString()} · sources:{" "}
            {[
              feed.sources.jplCad && "JPL CAD",
              feed.sources.nasaDonki && "DONKI",
            ]
              .filter(Boolean)
              .join(", ") || "none"}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
          Catalog · active now
        </h4>
        {catalogActive.length === 0 ? (
          <p className="text-sm text-slate-500">No catalog window open.</p>
        ) : (
          catalogActive.map((e) => (
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
          Catalog · upcoming
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

function LiveCard({
  item,
  badge,
  muted,
}: {
  item: LiveFeedItem;
  badge: string;
  muted?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border p-3 ${
        muted
          ? "border-white/10 bg-white/[0.03]"
          : "border-cyan-400/25 bg-cyan-500/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h5
          className={`font-medium ${muted ? "text-slate-200" : "text-cyan-50"}`}
        >
          {item.name}
        </h5>
        <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] uppercase text-slate-300">
          {badge}
        </span>
        <span className="text-[10px] uppercase text-slate-500">
          {item.source === "jpl_cad" ? "JPL CAD" : "NASA DONKI"}
        </span>
        {item.rewardMultiplier && item.rewardMultiplier > 1 && (
          <span className="text-xs tabular-nums text-amber-200">
            ×{item.rewardMultiplier}
            {item.bonusCredits ? ` · +${item.bonusCredits} cr` : ""}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.blurb}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span>
          {new Date(item.startMs).toLocaleString()} –{" "}
          {new Date(item.endMs).toLocaleString()}
        </span>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400/80 hover:underline"
          >
            Source ↗
          </a>
        )}
      </div>
    </article>
  );
}

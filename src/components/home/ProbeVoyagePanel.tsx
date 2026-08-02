"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Craft, VoyageDebrief } from "@/lib/types";
import { loadFleet } from "@/lib/storage";
import {
  isReadyToReturn,
  returnProbe,
  tickAllVoyages,
  voyageProgress,
  forceReadySoon,
} from "@/lib/probe-voyage";
import { getPersonality, getScar } from "@/lib/probe-personality";
import { useAuth } from "@/components/auth/AuthProvider";
import { DebriefModal } from "./DebriefModal";
import { collectionStats } from "@/lib/probe-loot";

export function ProbeVoyagePanel() {
  const { syncContext } = useAuth();
  const [inflight, setInflight] = useState<Craft[]>([]);
  const [complete, setComplete] = useState<Craft[]>([]);
  const [fresh, setFresh] = useState<
    { craftId: string; name: string; text: string }[]
  >([]);
  const [debrief, setDebrief] = useState<VoyageDebrief | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [coll, setColl] = useState(collectionStats());

  const refresh = useCallback(() => {
    const { freshPings } = tickAllVoyages(syncContext);
    if (freshPings.length) {
      setFresh((prev) => [...freshPings, ...prev].slice(0, 8));
    }
    const fleet = loadFleet();
    setInflight(fleet.crafts.filter((c) => c.status === "inflight"));
    setComplete(
      fleet.crafts.filter((c) => c.status === "complete" && c.lastDebrief)
    );
    setColl(collectionStats());
  }, [syncContext]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  function onReturn(id: string) {
    setErr(null);
    const res = returnProbe(id, syncContext);
    if (!res.ok || !res.debrief) {
      setErr(res.error ?? "Could not call them home");
      return;
    }
    setDebrief(res.debrief);
    refresh();
  }

  function onReread(c: Craft) {
    if (c.lastDebrief) setDebrief(c.lastDebrief);
  }

  // Hidden dev aid: double-click header to force first inflight ready
  function onForceReady() {
    const c = inflight[0];
    if (!c) return;
    forceReadySoon(c.id, syncContext);
    refresh();
  }

  return (
    <>
      <section id="voyages" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
              Little ships · big personalities
            </p>
            <h2
              className="text-xl font-semibold text-white sm:text-2xl"
              onDoubleClick={onForceReady}
              title="Double-click to force first probe ready (testing)"
            >
              Out there / coming home
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Travel is mostly automatic. The game starts when they return.
              Collection {coll.found}/{coll.total} cursed finds.
            </p>
          </div>
        </div>

        {fresh.length > 0 && (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-950/30 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              New pings
            </p>
            <ul className="mt-2 space-y-2">
              {fresh.slice(0, 4).map((p, i) => (
                <li key={`${p.craftId}-${i}`} className="text-sm text-amber-50">
                  <span className="font-medium text-amber-200">{p.name}:</span>{" "}
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {inflight.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center">
            <p className="text-slate-400">
              No probes away. Launch a personality — they’ll live a little life
              and bring something back.
            </p>
            <a
              href="#launch"
              className="mt-3 inline-block text-sm font-medium text-cyan-400 hover:underline"
            >
              Send someone weird →
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {inflight.map((c) => {
              const pct = Math.round(voyageProgress(c) * 100);
              const ready = isReadyToReturn(c);
              const personality = getPersonality(c.personalityId ?? "chipper");
              const lastPing = c.pings?.[c.pings.length - 1];
              return (
                <li
                  key={c.id}
                  className={`rounded-2xl border p-4 ${
                    ready
                      ? "border-emerald-400/40 bg-emerald-950/30"
                      : "border-white/10 bg-slate-900/60"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {c.name}
                        </h3>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-300">
                          {personality.label}
                        </span>
                        {ready && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                            Ready to come home
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {c.personalityVibe ?? personality.vibe}
                      </p>
                      {(c.scarIds?.length ?? 0) > 0 && (
                        <p className="mt-1 text-xs text-rose-300/80">
                          {(c.scarIds ?? [])
                            .map((id) => getScar(id).label)
                            .join(" · ")}
                        </p>
                      )}
                      {lastPing && (
                        <p className="mt-2 text-sm italic text-slate-300">
                          “{lastPing.text}”
                        </p>
                      )}
                      <div className="mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${
                            ready ? "bg-emerald-400" : "bg-cyan-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Voyage {pct}%
                        {c.expectedReturnAt
                          ? ready
                            ? " · call them home"
                            : ` · ETA ~${Math.max(
                                1,
                                Math.ceil(
                                  (c.expectedReturnAt - Date.now()) / 60000
                                )
                              )}m`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ready ? (
                        <button
                          type="button"
                          onClick={() => onReturn(c.id)}
                          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                        >
                          Debrief
                        </button>
                      ) : (
                        <Link
                          href={`/mission/${c.id}`}
                          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10"
                        >
                          Check in
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {complete.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Companions who made it back
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {complete.slice(0, 12).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onReread(c)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:border-cyan-400/30 hover:text-cyan-100"
                >
                  {c.name}
                  {(c.scarIds?.length ?? 0) > 0 ? " · scarred" : ""}
                </button>
              ))}
            </ul>
          </div>
        )}

        {err && (
          <p className="text-sm text-rose-300" role="alert">
            {err}
          </p>
        )}
      </section>

      {debrief && (
        <DebriefModal debrief={debrief} onClose={() => setDebrief(null)} />
      )}
    </>
  );
}

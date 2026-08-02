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
import { retireProbe } from "@/lib/probe-memorial";
import { bondLabel } from "@/lib/probe-relationship";
import { quickLaunch } from "@/lib/quick-launch";
import { useRouter } from "next/navigation";

export function ProbeVoyagePanel() {
  const { syncContext } = useAuth();
  const router = useRouter();
  const [inflight, setInflight] = useState<Craft[]>([]);
  const [complete, setComplete] = useState<Craft[]>([]);
  const [lost, setLost] = useState<Craft[]>([]);
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
    setLost(fleet.crafts.filter((c) => c.status === "lost"));
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

  function onRetire(c: Craft) {
    const plaque = window.prompt(
      `Plaque for ${c.name}?`,
      `${c.name} — flew ${c.voyagesCompleted ?? 0} voyages, came home weird.`
    );
    if (plaque === null) return;
    const res = retireProbe(c.id, plaque || undefined, syncContext);
    if (!res.ok) {
      setErr(res.error ?? "Could not retire");
      return;
    }
    refresh();
  }

  function onLineage(parent: Craft) {
    const res = quickLaunch("leo_scout", syncContext, {
      lineageParentId: parent.id,
    });
    if (!res.ok || !res.craft) {
      setErr(res.error ?? "Lineage launch failed");
      return;
    }
    router.push(`/mission/${res.craft.id}`);
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
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-200">
                          {bondLabel(c.relationship)}
                        </span>
                        {c.absurdLaunch && (
                          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-200">
                            Bad idea
                          </span>
                        )}
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

        {lost.length > 0 && (
          <div className="rounded-2xl border border-rose-400/25 bg-rose-950/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
              Silent · last messages
            </p>
            <ul className="mt-2 space-y-2">
              {lost.map((c) => (
                <li key={c.id} className="text-sm text-rose-50/90">
                  <span className="font-medium text-rose-200">{c.name}:</span>{" "}
                  {c.lastMessage ?? "…"}
                  <button
                    type="button"
                    onClick={() => onRetire(c)}
                    className="ml-2 text-xs text-slate-400 underline hover:text-white"
                  >
                    Memorial
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {complete.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Companions who made it back
            </p>
            <ul className="mt-2 space-y-2">
              {complete.slice(0, 12).map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => onReread(c)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300 hover:border-cyan-400/30 hover:text-cyan-100"
                  >
                    {c.name}
                    {(c.scarIds?.length ?? 0) > 0 ? " · scarred" : ""}
                    {c.relationship != null
                      ? ` · ${bondLabel(c.relationship)}`
                      : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => onLineage(c)}
                    className="text-violet-300/90 hover:underline"
                  >
                    Launch descendant
                  </button>
                  <button
                    type="button"
                    onClick={() => onRetire(c)}
                    className="text-slate-500 hover:underline"
                  >
                    Retire
                  </button>
                </li>
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

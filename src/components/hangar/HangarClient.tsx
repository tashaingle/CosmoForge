"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createCraft,
  deleteCraft,
  loadFleet,
  upsertCraft,
} from "@/lib/storage";
import { computeStats, formatDeltaV, formatMass } from "@/lib/ship";
import { MISSION_PROFILES } from "@/lib/orbital";
import type { Craft, FleetState } from "@/lib/types";

export function HangarClient() {
  const [fleet, setFleet] = useState<FleetState | null>(null);

  useEffect(() => {
    setFleet(loadFleet());
  }, []);

  function refresh() {
    setFleet(loadFleet());
  }

  function onNew() {
    const craft = createCraft(`Probe ${((fleet?.crafts.length ?? 0) + 1)}`);
    upsertCraft(craft);
    refresh();
    window.location.href = `/design/${craft.id}`;
  }

  function onDelete(id: string) {
    if (!confirm("Delete this craft?")) return;
    deleteCraft(id);
    refresh();
  }

  if (!fleet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading hangar…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#0e749022_0%,_transparent_50%),radial-gradient(ellipse_at_bottom,_#1e3a5f33_0%,_#020617_60%)]" />

      <div className="relative mx-auto max-w-5xl px-4 py-10">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/80">
            CosmoForge Alpha
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Design. Launch.{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Command.
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Build modular spacecraft, launch into a living solar system with
            real-ish orbital mechanics, and watch your craft keep flying even
            after you close the tab.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onNew}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-400"
            >
              + New spacecraft
            </button>
            <a
              href="#fleet"
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/5"
            >
              Your fleet
            </a>
          </div>
        </header>

        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Design & build",
              d: "Drag modules, watch mass, power, and Δv update live.",
            },
            {
              t: "Launch & explore",
              d: "LEO, lunar, Mars transfer, or belt scout missions.",
            },
            {
              t: "Persistent sim",
              d: "Time acceleration + offline progress in local hangar.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-4"
            >
              <h2 className="font-semibold text-cyan-200">{c.t}</h2>
              <p className="mt-1 text-sm text-slate-400">{c.d}</p>
            </div>
          ))}
        </section>

        <section id="fleet">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Hangar</h2>
            <span className="text-sm text-slate-500">
              {fleet.crafts.length} craft
              {fleet.crafts.length === 1 ? "" : "s"}
            </span>
          </div>

          {fleet.crafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-6 py-12 text-center">
              <p className="text-slate-400">
                No spacecraft yet. Assemble your first probe.
              </p>
              <button
                type="button"
                onClick={onNew}
                className="mt-4 rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30"
              >
                Start design
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {fleet.crafts.map((craft) => (
                <CraftRow
                  key={craft.id}
                  craft={craft}
                  onDelete={() => onDelete(craft.id)}
                />
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
          CosmoForge Alpha · Web-first playable slice · Not affiliated with NASA
        </footer>
      </div>
    </div>
  );
}

function CraftRow({
  craft,
  onDelete,
}: {
  craft: Craft;
  onDelete: () => void;
}) {
  const stats = computeStats(craft.partIds);
  const mission = MISSION_PROFILES.find((m) => m.id === craft.missionId);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-medium text-white">{craft.name}</h3>
          <StatusBadge status={craft.status} />
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {formatMass(stats.wetMassKg)} · {formatDeltaV(stats.deltaVms)} Δv ·{" "}
          {craft.partIds.length} modules
          {mission ? ` · ${mission.name}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {craft.status === "design" && (
          <>
            <Link
              href={`/design/${craft.id}`}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
            >
              Edit design
            </Link>
            <Link
              href={`/launch/${craft.id}`}
              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-cyan-400"
            >
              Launch
            </Link>
          </>
        )}
        {craft.status === "inflight" && (
          <Link
            href={`/mission/${craft.id}`}
            className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            Command
          </Link>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg px-3 py-1.5 text-sm text-rose-300/80 hover:bg-rose-500/10"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: Craft["status"] }) {
  const map = {
    design: "bg-slate-500/20 text-slate-300",
    inflight: "bg-emerald-500/20 text-emerald-300",
    complete: "bg-violet-500/20 text-violet-300",
  };
  const label = {
    design: "In design",
    inflight: "In flight",
    complete: "Complete",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

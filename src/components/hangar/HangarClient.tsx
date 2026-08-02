"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createCraft,
  deleteCraft,
  loadFleet,
  upsertCraft,
  setLocalCommanderName,
} from "@/lib/storage";
import { computeStats, formatDeltaV, formatMass } from "@/lib/ship";
import { MISSION_PROFILES } from "@/lib/orbital";
import type { Craft, FleetState } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { LoadingScreen, InlineSpinner } from "@/components/ui/LoadingScreen";
import { SkyEventsPanel } from "@/components/events/SkyEventsPanel";
import { CosmeticsShop } from "@/components/shop/CosmeticsShop";
import { MarketplacePanel } from "@/components/market/MarketplacePanel";
import { SolarPassportPanel } from "@/components/passport/SolarPassportPanel";
import { getActiveSkyEvents } from "@/lib/sky-events";
import { getSkin } from "@/lib/cosmetics";
import type { PlayerWallet } from "@/lib/economy";

export function HangarClient() {
  const {
    ready,
    user,
    displayName,
    configured,
    cloudSyncing,
    cloudSynced,
    syncContext,
    wallet,
    updateDisplayName,
    refreshCloudFleet,
    refreshWallet,
  } = useAuth();
  const [fleet, setFleet] = useState<FleetState | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [nameEdit, setNameEdit] = useState("");
  const [localWallet, setLocalWallet] = useState<PlayerWallet | null>(null);

  useEffect(() => {
    if (!ready) return;
    setFleet(loadFleet());
    setNameEdit(displayName);
    setLocalWallet(wallet);
  }, [ready, displayName, cloudSynced, cloudSyncing, wallet]);

  function refresh() {
    setFleet(loadFleet());
    refreshWallet();
    setLocalWallet(wallet);
  }

  function onNew() {
    const skin = (localWallet ?? wallet).equippedSkinId;
    const craft = createCraft(
      `Probe ${((fleet?.crafts.length ?? 0) + 1)}`,
      skin
    );
    craft.commanderName = displayName;
    upsertCraft(craft, syncContext);
    refresh();
    window.location.href = `/design/${craft.id}`;
  }

  const activeEvents = getActiveSkyEvents();

  function onDelete(id: string) {
    if (!confirm("Delete this craft?")) return;
    deleteCraft(id, syncContext);
    refresh();
  }

  async function onSaveName() {
    await updateDisplayName(nameEdit);
    setLocalCommanderName(nameEdit);
    refresh();
  }

  if (!ready || !fleet) {
    return <LoadingScreen label="Preparing hangar…" />;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#0e749028_0%,_transparent_45%),radial-gradient(ellipse_at_bottom_right,_#1e3a8a33_0%,_#020617_55%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:32px_32px]" />

      <SiteHeader />

      {/* Hero — App Store style */}
      <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:pb-14 sm:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-400/90">
              CosmoForge · Live Alpha
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Design. Launch.{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                Command.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
              Explore a living solar system — planets, major moons, live NEOs —
              complete mission goals, stamp your{" "}
              <strong className="font-medium text-slate-200">
                solar passport
              </strong>
              , and come back when the real sky changes the rewards.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={onNew}
                className="rounded-2xl bg-cyan-500 px-6 py-3.5 text-center text-sm font-semibold text-slate-950 shadow-xl shadow-cyan-500/25 transition hover:bg-cyan-400"
              >
                + New spacecraft
              </button>
              <a
                href="#hangar"
                className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-center text-sm font-medium text-slate-100 backdrop-blur hover:bg-white/10"
              >
                Open hangar
              </a>
              {!user && configured && (
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="rounded-2xl border border-cyan-400/30 px-6 py-3.5 text-center text-sm font-medium text-cyan-200 hover:bg-cyan-500/10"
                >
                  Sign in to sync fleet
                </button>
              )}
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500 sm:text-sm">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Free to play
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Cloud hangar
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                Shared solar system
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Credits &amp; cosmetics
              </li>
            </ul>

            {activeEvents.length > 0 && (
              <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  Live sky event
                </p>
                <p className="mt-1 text-sm font-medium text-emerald-50">
                  {activeEvents[0].name}
                  {activeEvents.length > 1
                    ? ` +${activeEvents.length - 1} more`
                    : ""}
                </p>
                <p className="mt-0.5 text-xs text-emerald-100/70">
                  Launch bonuses active ·{" "}
                  <a href="#events" className="underline hover:text-white">
                    see all
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Phone-ish preview card */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-transparent to-violet-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-900/80 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-xs font-medium text-slate-300">
                  Mission view
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                  LIVE
                </span>
              </div>
              <div className="relative h-56 bg-[radial-gradient(circle_at_30%_40%,#1e293b,transparent_50%),radial-gradient(circle_at_70%_60%,#0e7490_0%,#020617_55%)] sm:h-64">
                <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_40px_#fbbf24]" />
                <div className="absolute left-[22%] top-[42%] h-2.5 w-2.5 rounded-full bg-blue-400" />
                <div className="absolute right-[28%] top-[38%] h-2 w-2 rounded-full bg-red-400" />
                <div className="absolute bottom-[32%] left-[48%] h-2 w-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]" />
                <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/10 bg-black/50 p-2.5 text-[10px] text-slate-300 backdrop-blur">
                  <div className="flex justify-between">
                    <span>Δv budget</span>
                    <span className="text-cyan-300">2.1 km/s</span>
                  </div>
                  <div className="mt-1 flex justify-between text-slate-500">
                    <span>Traffic</span>
                    <span className="text-violet-300">shared map</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3 text-center text-[10px] text-slate-400">
                <div className="rounded-lg bg-white/5 py-2">Design</div>
                <div className="rounded-lg bg-cyan-500/20 py-2 text-cyan-200">
                  Launch
                </div>
                <div className="rounded-lg bg-white/5 py-2">Command</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              t: "Design & build",
              d: "Modular parts with mass, power, and rocket-equation Δv.",
            },
            {
              t: "Sky events",
              d: "Real calendar windows boost rewards and unlock missions.",
            },
            {
              t: "Credits economy",
              d: "Earn on launch, spend on limited liveries and prestige skins.",
            },
            {
              t: "Shared sky",
              d: "Other commanders appear live — with their cosmetics.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur"
            >
              <h2 className="font-semibold text-cyan-100">{c.t}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {c.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="passport" className="relative mx-auto max-w-6xl px-4 pb-8">
        <SolarPassportPanel />
      </section>

      {/* Events + shop */}
      <section
        id="events"
        className="relative mx-auto max-w-6xl space-y-4 px-4 pb-10"
      >
        <SkyEventsPanel />
      </section>
      <section id="shop" className="relative mx-auto max-w-6xl px-4 pb-8">
        {(localWallet || wallet) && (
          <CosmeticsShop
            wallet={localWallet ?? wallet}
            onWalletChange={(w) => {
              setLocalWallet(w);
              refreshWallet();
            }}
          />
        )}
      </section>
      <section id="market" className="relative mx-auto max-w-6xl px-4 pb-12">
        <MarketplacePanel />
      </section>

      {/* Hangar */}
      <section id="hangar" className="relative mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Hangar</h2>
            <p className="mt-1 text-sm text-slate-400">
              {user ? (
                <>
                  Signed in as{" "}
                  <span className="text-slate-200">{displayName}</span>
                  {cloudSyncing ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
                      <InlineSpinner /> syncing
                    </span>
                  ) : cloudSynced ? (
                    <span className="ml-2 text-emerald-400/90">· cloud on</span>
                  ) : null}
                </>
              ) : (
                <>
                  Local hangar
                  {configured && (
                    <>
                      {" "}
                      ·{" "}
                      <button
                        type="button"
                        onClick={() => setAuthOpen(true)}
                        className="text-cyan-400 hover:underline"
                      >
                        sign in to sync
                      </button>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={() => void refreshCloudFleet().then(refresh)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
              >
                Refresh cloud
              </button>
            )}
            <button
              type="button"
              onClick={onNew}
              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 sm:text-sm"
            >
              + New craft
            </button>
          </div>
        </div>

        {/* Commander name */}
        <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-3 sm:flex-row sm:items-center sm:p-4">
          <label className="shrink-0 text-xs uppercase tracking-wider text-slate-500">
            Commander name
          </label>
          <input
            value={nameEdit}
            onChange={(e) => setNameEdit(e.target.value)}
            maxLength={40}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 focus:ring-2"
            placeholder="Your callsign"
          />
          <button
            type="button"
            onClick={() => void onSaveName()}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            Save
          </button>
        </div>

        {fleet.crafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-6 py-14 text-center">
            <p className="text-slate-400">
              No spacecraft yet. Assemble your first probe.
            </p>
            <button
              type="button"
              onClick={onNew}
              className="mt-4 rounded-xl bg-cyan-500/20 px-5 py-2.5 text-sm text-cyan-200 hover:bg-cyan-500/30"
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

      <footer className="relative border-t border-white/10 py-8 text-center text-xs text-slate-600">
        <p>CosmoForge Alpha · Not affiliated with NASA/JPL</p>
        <p className="mt-1 text-slate-700">
          Built for the long game — solar system first, stars later.
        </p>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
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
  const skin = getSkin(craft.skinId);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: skin.color }}
            title={skin.name}
          />
          <h3 className="truncate text-lg font-medium text-white">
            {craft.name}
          </h3>
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
              className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            >
              Edit
            </Link>
            <Link
              href={`/launch/${craft.id}`}
              className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
            >
              Launch
            </Link>
          </>
        )}
        {craft.status === "inflight" && (
          <Link
            href={`/mission/${craft.id}`}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            Command
          </Link>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg px-3 py-2 text-sm text-rose-300/80 hover:bg-rose-500/10"
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

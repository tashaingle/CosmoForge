"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
import { QuickLaunchPanel } from "@/components/home/QuickLaunchPanel";
import {
  AwayReportBanner,
  FleetStatusPanel,
} from "@/components/home/FleetStatusPanel";
import { DailyQuestCompact } from "@/components/home/DailyQuestCompact";
import { ProbeVoyagePanel } from "@/components/home/ProbeVoyagePanel";
import { getActiveSkyEvents } from "@/lib/sky-events";
import { getSkin } from "@/lib/cosmetics";
import type { PlayerWallet } from "@/lib/economy";
import {
  buildAwayReport,
  catchUpCraftOffline,
  noteHomeVisit,
  type AwayReport,
} from "@/lib/away-report";

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
  const [awayReport, setAwayReport] = useState<AwayReport | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const rebuildHome = useCallback(() => {
    const raw = loadFleet();
    const advancedById: Record<string, number> = {};

    // Offline catch-up before building the report
    for (const c of raw.crafts) {
      if (c.status !== "inflight") continue;
      const { craft, advancedMs } = catchUpCraftOffline(c);
      if (advancedMs > 0) {
        upsertCraft(craft, syncContext);
        advancedById[craft.id] = advancedMs;
      }
    }

    const next = loadFleet();
    setFleet(next);
    const inflight = next.crafts.filter((c) => c.status === "inflight");
    setAwayReport(buildAwayReport(inflight, advancedById));
    noteHomeVisit();
  }, [syncContext]);

  useEffect(() => {
    if (!ready) return;
    rebuildHome();
    setNameEdit(displayName);
    setLocalWallet(wallet);
  }, [ready, displayName, cloudSynced, cloudSyncing, wallet, rebuildHome]);

  // Deep links into shop/market/hangar open the Advanced drawer
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (
      hash === "advanced" ||
      hash === "hangar" ||
      hash === "shop" ||
      hash === "market" ||
      hash === "passport" ||
      hash === "events"
    ) {
      setAdvancedOpen(true);
    }
  }, []);

  function refresh() {
    rebuildHome();
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
  const inflightCount =
    fleet?.crafts.filter((c) => c.status === "inflight").length ?? 0;
  const designCount =
    fleet?.crafts.filter((c) => c.status === "design").length ?? 0;

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

  if (!ready || !fleet || !awayReport) {
    return <LoadingScreen label="Acquiring fleet signal…" />;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#0e749028_0%,_transparent_45%),radial-gradient(ellipse_at_bottom_right,_#1e3a8a33_0%,_#020617_55%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:32px_32px]" />

      <SiteHeader />

      <main className="relative mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6 sm:pt-8">
        {/* Hero — little ships with big personalities */}
        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-300/90">
              CosmoForge · slightly unhinged mission control
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Little ships with{" "}
              <span className="bg-gradient-to-r from-violet-300 via-cyan-300 to-amber-200 bg-clip-text text-transparent">
                big personalities
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
              You launch weird probes into a real-ish solar system. They fly
              without you, send odd pings, come back changed — and the real game
              is the debrief.
            </p>
          </div>

          {activeEvents.length > 0 && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Live sky event
              </p>
              <p className="mt-0.5 text-sm font-medium text-emerald-50">
                {activeEvents[0].name}
                {activeEvents.length > 1
                  ? ` +${activeEvents.length - 1} more`
                  : ""}
                <span className="font-normal text-emerald-100/70">
                  {" "}
                  · launch bonuses active
                </span>
              </p>
            </div>
          )}

          {!user && configured && (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="text-sm text-cyan-400 hover:underline"
            >
              Sign in to sync fleet across devices
            </button>
          )}
        </section>

        {/* Core loop: voyages, pings, debriefs */}
        <ProbeVoyagePanel />

        {/* One-tap personality launches */}
        <QuickLaunchPanel
          syncContext={syncContext}
          hasInflight={inflightCount > 0}
          compact={inflightCount === 0}
        />

        {/* While you were away (sim catch-up) */}
        <AwayReportBanner report={awayReport} />

        {/* Fleet telemetry / command links */}
        <FleetStatusPanel report={awayReport} onRefresh={refresh} />

        {/* Daily quest — light retention */}
        <DailyQuestCompact />

        {/* Advanced: design hangar, economy, passport */}
        <section
          id="advanced"
          className="rounded-2xl border border-white/10 bg-slate-900/40"
        >
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
            aria-expanded={advancedOpen}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Advanced
              </p>
              <h2 className="text-lg font-semibold text-white">
                Design hangar, passport, shop &amp; market
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {designCount} in design
                {user
                  ? cloudSyncing
                    ? " · syncing"
                    : cloudSynced
                      ? " · cloud on"
                      : ""
                  : " · local only"}
              </p>
            </div>
            <span className="text-slate-400" aria-hidden>
              {advancedOpen ? "▲" : "▼"}
            </span>
          </button>

          {advancedOpen && (
            <div className="space-y-8 border-t border-white/10 px-4 pb-6 pt-5 sm:px-5">
              {/* Hangar */}
              <div id="hangar">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Hangar</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Custom designs and full fleet list.
                      {user ? (
                        <>
                          {" "}
                          Signed in as{" "}
                          <span className="text-slate-200">{displayName}</span>
                          {cloudSyncing ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
                              <InlineSpinner /> syncing
                            </span>
                          ) : null}
                        </>
                      ) : null}
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
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 sm:text-sm"
                    >
                      + Custom design
                    </button>
                  </div>
                </div>

                <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:p-4">
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
                  <div className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
                    <p className="text-slate-400">
                      No custom craft yet. Use one-tap launch above, or design
                      from scratch.
                    </p>
                    <button
                      type="button"
                      onClick={onNew}
                      className="mt-4 rounded-xl bg-white/10 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/15"
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
              </div>

              <div id="passport">
                <SolarPassportPanel />
              </div>

              <div id="events">
                <SkyEventsPanel />
              </div>

              <div id="shop">
                {(localWallet || wallet) && (
                  <CosmeticsShop
                    wallet={localWallet ?? wallet}
                    onWalletChange={(w) => {
                      setLocalWallet(w);
                      refreshWallet();
                    }}
                  />
                )}
              </div>

              <div id="market">
                <MarketplacePanel />
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="relative border-t border-white/10 py-8 text-center text-xs text-slate-600">
        <p>CosmoForge Alpha · Not affiliated with NASA/JPL</p>
        <p className="mt-1 text-slate-700">
          Your ship keeps flying. Design is optional.
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

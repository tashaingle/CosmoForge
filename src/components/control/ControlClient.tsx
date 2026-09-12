"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { FleetRail } from "./FleetRail";
import { MissionStage } from "./MissionStage";
import { TransmissionsPanel } from "./TransmissionsPanel";
import { LaunchSequence } from "./LaunchSequence";
import { DevPanel, type DevAction } from "./DevPanel";
import { DebriefModal } from "@/components/home/DebriefModal";
import { loadFleet, replaceFleet, upsertCraft } from "@/lib/storage";
import { tickAllVoyages, returnProbe, voyageDurationMs } from "@/lib/probe-voyage";
import { quickLaunch, LAUNCH_PRESETS } from "@/lib/quick-launch";
import { resolveTransmissionChoice } from "@/game/transmissions";
import type { EncounterChoiceId } from "@/game/encounters";
import { getActiveSkyEvents } from "@/lib/sky-events";
import { loadWallet } from "@/lib/economy";
import type { Craft, FleetState, ProbePing, VoyageDebrief } from "@/lib/types";
import { beginDevelopmentReplay } from "@/lib/onboarding";

const SAVE_KEYS = ["cosmoforge-fleet-v1", "cosmoforge-wallet-v1", "cosmoforge-collection-v1", "cosmoforge-daily-v1", "cosmoforge-objectives-v1", "cosmoforge-passport-v1", "cosmoforge-memorials-v1", "cosmoforge-last-messages-v1", "cosmoforge-last-home-ms", "cosmoforge-onboarding-v1"];

export function ControlClient() {
  const { ready, syncContext, wallet, refreshWallet, cloudSynced, cloudSyncing } = useAuth();
  const [fleet, setFleet] = useState<FleetState | null>(null);
  const [now, setNow] = useState(0);
  const [debrief, setDebrief] = useState<VoyageDebrief | null>(null);
  const [launch, setLaunch] = useState<{ craft: Craft; stage: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    tickAllVoyages(syncContext);
    setFleet(loadFleet());
    setNow(Date.now());
  }, [syncContext]);

  useEffect(() => {
    const start = window.setTimeout(refresh, 0);
    const interval = window.setInterval(refresh, 15000);
    return () => { window.clearTimeout(start); window.clearInterval(interval); };
  }, [refresh, cloudSynced, cloudSyncing]);

  const playable = useMemo(() => fleet?.crafts.filter((c) => c.status !== "design" && c.status !== "retired") ?? [], [fleet]);
  const selected = playable.find((c) => c.id === fleet?.selectedCraftId) ?? playable[0] ?? null;
  const active = playable.filter((c) => c.status === "inflight");

  function selectCraft(id: string) {
    if (!fleet) return;
    setFleet(replaceFleet(fleet.crafts, id));
  }

  function callHome() {
    if (!selected) return;
    const result = returnProbe(selected.id, syncContext);
    if (result.debrief) setDebrief(result.debrief); else setError(result.error ?? "Signal refused to cooperate.");
    refresh();
  }

  function choose(pingId: string, choiceId: EncounterChoiceId) {
    if (!selected) return;
    resolveTransmissionChoice(selected, pingId, choiceId, syncContext);
    refresh();
  }

  function startLaunch() {
    setError(null);
    const preset = LAUNCH_PRESETS.find((p) => p.id === "leo_scout") ?? LAUNCH_PRESETS[0];
    const result = quickLaunch(preset.id, syncContext);
    if (!result.ok || !result.craft) { setError(result.error ?? "Launch paperwork became sentient."); return; }
    const craft = result.craft;
    setLaunch({ craft, stage: 0 });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timings = reduced ? [80, 160, 240, 400] : [750, 1500, 2250, 3300];
    timings.forEach((delay, index) => window.setTimeout(() => setLaunch({ craft, stage: index + 1 }), delay));
    window.setTimeout(() => { setLaunch(null); refresh(); selectCraftFromLatest(craft.id); }, reduced ? 650 : 4300);
  }

  function selectCraftFromLatest(id: string) {
    const latest = loadFleet();
    setFleet(replaceFleet(latest.crafts, id));
  }

  function devAction(action: DevAction) {
    if (action === "onboarding") { beginDevelopmentReplay(); window.location.reload(); return; }
    if (action === "reset") { if (window.confirm("Erase every local CosmoForge save? Cloud data is untouched.")) { SAVE_KEYS.forEach((key) => localStorage.removeItem(key)); window.location.reload(); } return; }
    if (action === "credits") { const next = loadWallet(); next.credits += 500; next.updatedAt = Date.now(); localStorage.setItem("cosmoforge-wallet-v1", JSON.stringify(next)); refreshWallet(); return; }
    if (!selected) return;
    const craft = { ...selected };
    if (action === "advance" || action === "complete") { const duration = voyageDurationMs(craft.missionId); craft.launchedAt = Date.now() - duration * (action === "complete" ? 1.1 : Math.min(.95, ((Date.now() - (craft.launchedAt ?? Date.now())) / duration) + .1)); if (action === "complete") craft.readyToReturn = true; }
    if (action === "transmission" || action === "weird") { const ping: ProbePing = { id: `dev-${Date.now()}`, atMs: Date.now(), kind: action === "weird" ? "milestone" : "chat", encounterId: action === "weird" ? "first_matching_signal" : undefined, text: action === "weird" ? "We found something. It is shaped like a bad decision." : "Development ping. Reality appears optional." }; craft.pings = [...(craft.pings ?? []), ping]; }
    if (action === "scar") craft.scarIds = [...new Set([...(craft.scarIds ?? []), "scorched" as const])];
    if (action === "rare") craft.cargoLootIds = [...new Set([...(craft.cargoLootIds ?? []), "unscheduled_emotion" as const])];
    if (action === "cursed") craft.cargoLootIds = [...new Set([...(craft.cargoLootIds ?? []), "friend_shaped_void" as const])];
    upsertCraft(craft, syncContext); refresh();
  }

  if (!ready || !fleet || now === 0) return <LoadingScreen label="Tuning the fleet frequencies…" />;
  const event = getActiveSkyEvents()[0];
  return <main className="control-shell">
    <header className="control-header"><Link href="/" className="control-wordmark">COSMOFORGE <span>α</span></Link><nav aria-label="Primary"><Link href="/" className="active">Control</Link><Link href="/hangar">Hangar</Link><Link href="/archive">Archive</Link></nav><div className="control-telemetry"><span>{active.length} ships away</span><span>✦ {wallet.credits}</span><span className={event ? "text-emerald-300" : ""}>{event ? `LIVE SKY · ${event.name}` : "SKY QUIET"}</span></div></header>
    <div id="control" className="control-grid"><FleetRail crafts={playable} selectedId={selected?.id} now={now} onSelect={selectCraft} /><MissionStage craft={selected} now={now} onReturn={callHome} /><TransmissionsPanel craft={selected} onChoice={choose} /></div>
    <section className="launch-dock"><div><p className="control-kicker">Launch rail 04</p><p className="text-sm text-slate-400">A fresh probe, a modest mission, absolutely no emotional consequences.</p></div><button type="button" onClick={startLaunch}>+ Send another weirdo into space</button></section>
    {error && <p className="mx-auto max-w-7xl px-4 pb-4 text-sm text-rose-300" role="alert">{error}</p>}
    <section className="secondary-docks"><div id="hangar"><p className="control-kicker">Hangar</p><h2>Design, repair and customise</h2><p>Your detailed builder, parts, cosmetics and fleet management remain intact.</p><Link href="/hangar">Enter hangar →</Link></div><div id="archive"><p className="control-kicker">Archive</p><h2>Things we brought home</h2><p>Solar Passport, discoveries, cursed finds, mission history and memorials live away from the flight console.</p><Link href="/archive">Browse archive records →</Link></div></section>
    <DevPanel selected={selected} onAction={devAction} />
    {launch && <LaunchSequence craft={launch.craft} stage={launch.stage} />}
    {debrief && <DebriefModal debrief={debrief} onClose={() => setDebrief(null)} />}
  </main>;
}

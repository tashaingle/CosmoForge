"use client";

import { useEffect, useState } from "react";
import type { Craft, VoyageDebrief } from "@/lib/types";
import { getLoot, catalogueDebriefOnce } from "@/lib/probe-loot";
import { getScar, getPersonality } from "@/lib/probe-personality";
import { loadWallet, saveWallet } from "@/lib/economy";
import { loadFleet } from "@/lib/storage";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProbeVisual } from "@/components/probe/ProbeVisual";
import { HangarScene3D } from "@/components/three/HangarScene3D";
import { Find3D } from "@/components/three/Find3D";
import { shareDebriefCard } from "@/lib/share-debrief";
import { getPreset } from "@/lib/quick-launch";
import { presetIdsUnlockedByLoot } from "@/lib/probe-unlocks";
import { ANALYSIS_COST, analyzeLoot } from "@/lib/probe-analysis";
import { affectionateBondLabel } from "@/lib/probe-relationship";

type DebriefActions = {
  primaryLabel: string;
  onPrimary: () => void;
  viewLabel: string;
  onView: () => void;
};

export function DebriefModal({ debrief, onClose, actions }: { debrief: VoyageDebrief; onClose: () => void; actions?: DebriefActions }) {
  const { persistWallet, refreshWallet } = useAuth();
  const [stage, setStage] = useState(0);
  const [reward, setReward] = useState<{ credits: number; newFinds: string[]; unlocks: string[] } | null>(null);
  const [analysisNote, setAnalysisNote] = useState(debrief.analysisNote ?? null);
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [craft] = useState<Craft | null>(() => loadFleet().crafts.find((item) => item.id === debrief.craftId) ?? null);
  const personality = getPersonality(debrief.personalityId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = catalogueDebriefOnce(debrief.craftId, debrief.lootIds);
      if (!result.alreadyClaimed && result.credits > 0) {
        const next = loadWallet();
        next.credits += result.credits;
        saveWallet(next);
        void persistWallet(next);
        refreshWallet();
      }
      const unlocks = presetIdsUnlockedByLoot(result.newFinds, result.collection).map((id) => getPreset(id as Parameters<typeof getPreset>[0]).label);
      setReward({ credits: result.alreadyClaimed ? 0 : result.credits, newFinds: result.newFinds.map((id) => getLoot(id).name), unlocks });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [debrief, persistWallet, refreshWallet]);

  async function share() {
    try { const result = await shareDebriefCard(debrief); setShareMsg(result.copied ? "Debrief link copied." : result.url); }
    catch { setShareMsg("The share antenna fell off."); }
  }

  function analyze() {
    setAnalysisErr(null);
    const result = analyzeLoot(debrief.lootIds, debrief.craftId);
    if (!result.ok) setAnalysisErr(result.error ?? "Analysis failed");
    else { setAnalysisNote(result.note ?? "Analysis inconclusive, dramatically."); refreshWallet(); }
  }

  return <div className={`debrief-screen debrief-stage-${stage}`} role="dialog" aria-modal aria-labelledby="debrief-title">
    <div className="debrief-noise" />
    <div className="debrief-content">
      <header><p className="control-kicker">Recovery channel {"//"} {String(stage + 1).padStart(2, "0")}</p><h2 id="debrief-title">{stage === 0 ? "SIGNAL ACQUIRED" : debrief.craftName}</h2><p>{debrief.missionName} · {personality.label} · {debrief.relationshipLabel}</p></header>
      {stage === 0 && <div className="debrief-signal"><div className="debrief-radar" /><p>Carrier wave identified.</p><blockquote>“{debrief.opener}”</blockquote></div>}
      {stage === 1 && <div className="debrief-reveal">{craft && <div className="h-64"><HangarScene3D craft={craft} phase="inspect" fallback={<ProbeVisual craft={craft} />} /></div>}<div><p className="control-kicker">Physical changes</p>{debrief.scarIds.length ? debrief.scarIds.map((id) => { const scar = getScar(id); return <article key={id} className="scar-stamp"><strong>{scar.label}</strong><span>{scar.blurb}</span></article>; }) : <p className="mt-3 text-slate-400">No new scars. Suspiciously tidy.</p>}</div></div>}
      {stage === 2 && <div className="debrief-cargo-stage">{debrief.lootIds[0] && (() => { const loot = getLoot(debrief.lootIds[0]); return <Find3D lootId={loot.id} rarity={loot.rarity} presentation="cargo" fallback={<div className="cargo-fallback-mark">?</div>} />; })()}<div className="cargo-grid">{debrief.lootIds.length ? debrief.lootIds.map((id, index) => { const loot = getLoot(id); return <article key={`${id}-${index}`} style={{ animationDelay: `${index * 120}ms` }} className={`cargo-item cargo-${loot.rarity}`}><p>{loot.rarity}</p><h3>{loot.name}</h3><span>{loot.blurb}</span><strong>✦ {loot.creditValue}</strong></article>; }) : <p>The cargo bay contains one embarrassed dust mote.</p>}</div></div>}
      {stage >= 3 && <div className="debrief-summary"><blockquote>“{debrief.opener}”</blockquote><p>{debrief.summary}</p>{debrief.memoryLine && <div className="memory-card"><span>{debrief.craftName} remembers</span><strong>{debrief.memoryLine}</strong></div>}<ul>{debrief.highlights.map((item) => <li key={item}>{item}</li>)}</ul>{craft && <p className="bond-reveal">{craft.name} · {craft.voyagesCompleted ?? 0} voyage{craft.voyagesCompleted === 1 ? "" : "s"} · Bond: {affectionateBondLabel(craft)}{debrief.bondChange ? ` (+${debrief.bondChange})` : ""}</p>}{reward && <div className="reward-strip"><span>Recovered</span><strong>+ ✦ {reward.credits}</strong><span>{reward.newFinds.length ? `${reward.newFinds.length} new Codex ${reward.newFinds.length === 1 ? "entry" : "entries"}` : "Cargo already catalogued"}</span></div>}{reward?.unlocks.map((label) => <p key={label} className="unlock-line">UNLOCKED {"//"} {label}</p>)}{analysisNote ? <p className="analysis-slip">ANALYSIS {"//"} {analysisNote}</p> : <button type="button" className="debrief-minor" onClick={analyze}>Examine cargo · ✦ {ANALYSIS_COST}</button>}{analysisErr && <p className="text-sm text-rose-300">{analysisErr}</p>}</div>}
      <footer>{stage < 3 ? <button type="button" className="control-primary" onClick={() => setStage((value) => value + 1)}>{["Acquire signal", "Inspect the damage", "Open cargo"][stage]}</button> : actions ? <><button type="button" className="control-primary" onClick={actions.onPrimary}>{actions.primaryLabel}</button><button type="button" className="debrief-minor" onClick={actions.onView}>{actions.viewLabel}</button><button type="button" className="debrief-minor" onClick={onClose}>Return to control</button></> : <><button type="button" className="debrief-minor" onClick={() => void share()}>Share debrief</button><button type="button" className="control-primary" onClick={onClose}>Return to control</button></>}{shareMsg && <p>{shareMsg}</p>}</footer>
    </div>
  </div>;
}

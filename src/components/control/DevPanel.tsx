"use client";

import { useState } from "react";
import type { Craft } from "@/lib/types";
import { setThreePreference, type ThreePreference } from "@/components/three/three-quality";

export type DevAction = "advance" | "complete" | "transmission" | "scar" | "rare" | "cursed" | "credits" | "onboarding" | "reset" | "encounter_common" | "encounter_rare" | "encounter_cursed" | "clear_encounters";

type DevPanelProps = {
  selected: Craft | null;
  onAction: (action: DevAction) => void;
  onEncounter: (encounterId: string) => void;
};

export function DevPanel({ selected, onAction, onEncounter }: DevPanelProps) {
  const [encounterId, setEncounterId] = useState("");
  if (process.env.NODE_ENV !== "development") return null;

  const actions: [DevAction, string][] = [
    ["advance", "+10% mission"], ["complete", "Complete mission"], ["transmission", "Plain transmission"],
    ["encounter_common", "Random common"], ["encounter_rare", "Random rare"], ["encounter_cursed", "Random cursed"],
    ["clear_encounters", "Clear encounter history"], ["scar", "Add scar"], ["rare", "Rare find"],
    ["cursed", "Cursed find"], ["credits", "+500 credits"], ["onboarding", "Replay onboarding"], ["reset", "Reset local save"],
  ];
  const canRunWithoutProbe = (action: DevAction) => ["credits", "onboarding", "reset"].includes(action);

  return (
    <details className="dev-panel">
      <summary>DEV // CHEAT CONSOLE</summary>
      <p className="mt-2 text-xs text-slate-500">Target: {selected?.name ?? "none"}. This panel is removed from production builds.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map(([id, label]) => <button key={id} type="button" onClick={() => onAction(id)} disabled={!selected && !canRunWithoutProbe(id)}>{label}</button>)}
      </div>
      <div className="mt-3 border-t border-amber-400/20 pt-3">
        <p>3D QUALITY / FALLBACK</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["auto", "high", "low", "2d"] as ThreePreference[]).map((mode) => <button key={mode} type="button" onClick={() => setThreePreference(mode)}>{mode === "2d" ? "Force 2D fallback" : mode}</button>)}
        </div>
        <p className="mt-2 font-normal text-slate-500">Scar, common/rare/cursed find, launch and return buttons above exercise the corresponding 3D states.</p>
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (encounterId.trim()) onEncounter(encounterId.trim()); }}>
        <label className="sr-only" htmlFor="dev-encounter-id">Encounter ID</label>
        <input id="dev-encounter-id" value={encounterId} onChange={(event) => setEncounterId(event.target.value)} placeholder="encounter ID, e.g. extra_star" className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs" />
        <button type="submit" disabled={!selected || !encounterId.trim()}>Trigger ID</button>
      </form>
      {selected ? <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
        <details><summary>Probe memory</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(selected.memory ?? {}, null, 2)}</pre></details>
        <details><summary>Story / encounter state</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify({ storyFlags: selected.storyFlags ?? [], encounterHistory: selected.encounterHistory ?? {} }, null, 2)}</pre></details>
      </div> : null}
    </details>
  );
}

import type { Craft } from "@/lib/types";

export type DevAction = "advance" | "complete" | "transmission" | "weird" | "scar" | "rare" | "cursed" | "credits" | "onboarding" | "reset";

export function DevPanel({ selected, onAction }: { selected: Craft | null; onAction: (action: DevAction) => void }) {
  if (process.env.NODE_ENV !== "development") return null;
  const actions: [DevAction, string][] = [["advance", "+10% mission"], ["complete", "Complete mission"], ["transmission", "Trigger transmission"], ["weird", "Weird encounter"], ["scar", "Add scar"], ["rare", "Rare find"], ["cursed", "Cursed find"], ["credits", "+500 credits"], ["onboarding", "Replay onboarding"], ["reset", "Reset local save"]];
  return <details className="dev-panel"><summary>DEV // CHEAT CONSOLE</summary><p className="mt-2 text-xs text-slate-500">Target: {selected?.name ?? "none"}. This panel is removed from production builds.</p><div className="mt-3 flex flex-wrap gap-2">{actions.map(([id, label]) => <button key={id} type="button" onClick={() => onAction(id)} disabled={!selected && !["credits", "onboarding", "reset"].includes(id)}>{label}</button>)}</div></details>;
}

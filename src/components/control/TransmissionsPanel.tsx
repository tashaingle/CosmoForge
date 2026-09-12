import type { Craft } from "@/lib/types";
import { transmissionFor } from "@/game/transmissions";
import type { EncounterChoiceId } from "@/game/encounters";

export function TransmissionsPanel({ craft, onChoice }: { craft: Craft | null; onChoice: (pingId: string, choiceId: EncounterChoiceId) => void }) {
  const pings = [...(craft?.pings ?? [])].reverse().slice(0, 5);
  return (
    <aside className="transmissions-panel">
      <div className="flex items-center justify-between"><div><p className="control-kicker">Intercept channel</p><h2 className="text-lg font-semibold text-white">Transmissions</h2></div><span className="signal-live">live</span></div>
      <div className="transmission-scanline" />
      <div className="mt-4 space-y-5">
        {pings.length === 0 && <div className="py-10 text-center text-sm text-slate-500"><p className="text-2xl">⌁</p><p className="mt-2">Only radio snow. It may be judging you.</p></div>}
        {pings.map((raw) => { const ping = transmissionFor(raw); return <article key={ping.id} className="transmission"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">{craft?.name}{" // "}{ping.kind}</p><blockquote className="mt-2 text-sm leading-relaxed text-slate-100">“{ping.text}”</blockquote>{ping.resolutionText && <p className="mt-2 text-xs text-violet-300">↳ {ping.resolutionText}</p>}{ping.choices && <div className="mt-3 flex flex-wrap gap-2">{ping.choices.map((choice) => <button key={choice.id} type="button" onClick={() => onChoice(ping.id, choice.id)} className="transmission-choice">{choice.label}</button>)}</div>}</article>; })}
      </div>
    </aside>
  );
}

import type { Craft } from "@/lib/types";
import { transmissionFor } from "@/game/transmissions";

export function TransmissionsPanel({ craft, onChoice, awaitingChoice = false }: { craft: Craft | null; onChoice: (pingId: string, choiceId: string) => void; awaitingChoice?: boolean }) {
  const pings = [...(craft?.pings ?? [])].reverse().slice(0, 5);
  return (
    <aside className={`transmissions-panel ${awaitingChoice ? "transmissions-awaiting" : ""}`}>
      <div className="flex items-center justify-between"><div><p className="control-kicker">{awaitingChoice ? "Your move" : "Intercept channel"}</p><h2 className="text-lg font-semibold text-white">Transmissions</h2></div><span className="signal-live">{awaitingChoice ? "waiting" : "live"}</span></div>
      <div className="transmission-scanline" />
      <div className="mt-4 space-y-5">
        {pings.length === 0 && <div className="py-10 text-center text-sm text-slate-500"><p className="text-2xl">⌁</p><p className="mt-2">{craft?.status === "inflight" ? `${craft.name} is outbound. When something happens, the question appears here. Stay on this channel.` : "No probe on the line. Launch one, then this channel is how they talk to you."}</p></div>}
        {pings.map((raw) => { const ping = transmissionFor(raw); return <article key={ping.id} className="transmission"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">{craft?.name}{" // "}{ping.encounterTitle ?? ping.kind}{ping.rarity ? ` · ${ping.rarity}` : ""}</p><blockquote className="mt-2 text-sm leading-relaxed text-slate-100">“{ping.text}”</blockquote>{ping.resolutionText && <p className="mt-2 text-xs text-violet-300">↳ {ping.resolutionText}</p>}{ping.choices && <div className="mt-3 flex flex-wrap gap-2">{ping.choices.map((choice) => <button key={choice.id} type="button" onClick={() => onChoice(ping.id, choice.id)} className="transmission-choice">{choice.label}</button>)}</div>}</article>; })}
      </div>
    </aside>
  );
}

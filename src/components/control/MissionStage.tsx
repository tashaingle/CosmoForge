import Link from "next/link";
import type { Craft } from "@/lib/types";
import { MISSION_PROFILES } from "@/lib/orbital";
import { getPersonality, getScar } from "@/lib/probe-personality";
import { bondLabel } from "@/lib/probe-relationship";
import { voyageProgress, isReadyToReturn } from "@/lib/probe-voyage";
import { ProbeVisual } from "@/components/probe/ProbeVisual";

export function MissionStage({ craft, now, onReturn }: { craft: Craft | null; now: number; onReturn: () => void }) {
  if (!craft) return <section className="mission-stage grid place-items-center"><div className="text-center"><p className="control-kicker">No carrier signal</p><h2 className="mt-2 text-3xl font-bold">Send somebody weird into space.</h2></div></section>;
  const mission = MISSION_PROFILES.find((item) => item.id === craft.missionId);
  const personality = getPersonality(craft.personalityId ?? "chipper");
  const pct = Math.round(voyageProgress(craft, now) * 100);
  const ready = isReadyToReturn(craft, now);
  const destination = mission?.name ?? (craft.status === "complete" ? "Hangar berth" : "Unscheduled orbit");
  const atmosphere = craft.missionId?.includes("mars") ? "mission-mars" : craft.missionId?.includes("venus") ? "mission-venus" : craft.missionId?.includes("lunar") ? "mission-moon" : "mission-default";
  return (
    <section className={`mission-stage ${atmosphere}`}>
      <div className="mission-orbit" aria-hidden><i /><i /><i /></div>
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div><p className="control-kicker">Selected carrier · {destination}</p><h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-5xl">{craft.name}</h1><p className="mt-1 text-sm uppercase tracking-[.2em] text-slate-300">{personality.label} · Bond: {bondLabel(craft.relationship)}</p></div>
          <span className="id-plate">CF-{craft.id.slice(0, 5).toUpperCase()}</span>
        </div>
        <div className="min-h-0 flex-1"><ProbeVisual craft={craft} /></div>
        <div className="relative grid gap-4 border-t border-white/15 pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div><div className="flex justify-between text-xs uppercase tracking-wider text-slate-300"><span>{craft.status === "inflight" ? "Mission progress" : "Current condition"}</span><span>{craft.status === "inflight" ? `${pct}%` : "Home, somehow"}</span></div><div className="mt-2 h-1.5 overflow-hidden bg-black/40"><div className="h-full bg-cyan-300 shadow-[0_0_14px_#67e8f9]" style={{ width: `${craft.status === "inflight" ? pct : 100}%` }} /></div><p className="mt-3 text-xs text-slate-400">{craft.voyagesCompleted ?? 0} voyages · {(craft.scarIds ?? []).length} permanent scars{craft.scarIds?.length ? ` · ${craft.scarIds.slice(0, 2).map((id) => getScar(id).label).join(" / ")}` : ""}</p></div>
          {ready ? <button type="button" onClick={onReturn} className="control-primary">Acquire return signal</button> : craft.status === "inflight" ? <Link href={`/mission/${craft.id}`} className="control-secondary">Open flight console</Link> : <Link href={`/design/${craft.id}`} className="control-secondary">Inspect in hangar</Link>}
        </div>
      </div>
    </section>
  );
}

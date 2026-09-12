import type { Craft } from "@/lib/types";
import { getPersonality } from "@/lib/probe-personality";
import { voyageProgress, isReadyToReturn } from "@/lib/probe-voyage";
import { ProbeVisual } from "@/components/probe/ProbeVisual";

export function FleetRail({ crafts, selectedId, now, onSelect }: { crafts: Craft[]; selectedId?: string; now: number; onSelect: (id: string) => void }) {
  return (
    <aside className="control-fleet" aria-label="Fleet">
      <p className="control-kicker">Fleet frequencies</p>
      <h2 className="text-lg font-semibold text-white">Your weird little fleet</h2>
      <div className="mt-4 space-y-1">
        {crafts.length === 0 && <p className="py-6 text-sm text-slate-500">The hangar is suspiciously quiet.</p>}
        {crafts.map((craft) => {
          const pct = Math.round(voyageProgress(craft, now) * 100);
          const ready = isReadyToReturn(craft, now);
          const last = craft.pings?.at(-1)?.text;
          return (
            <button key={craft.id} type="button" onClick={() => onSelect(craft.id)} className={`fleet-signal ${selectedId === craft.id ? "fleet-signal-active" : ""}`}>
              <ProbeVisual craft={craft} size="small" />
              <span className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2 text-sm font-bold text-white"><i className={`h-2 w-2 rounded-full ${ready ? "bg-emerald-300" : craft.status === "lost" ? "bg-rose-400" : "bg-cyan-300"}`} />{craft.name}</span>
                <span className="mt-1 block text-[11px] uppercase tracking-wider text-slate-400">{ready ? "Returning · signal acquired" : craft.status === "inflight" ? `${craft.missionId?.replaceAll("_", " ")} · ${pct}%` : `${getPersonality(craft.personalityId ?? "chipper").label} · home`}</span>
                {last && <span className="mt-1 block truncate text-xs italic text-slate-500">“{last}”</span>}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

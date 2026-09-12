import type { Craft } from "@/lib/types";
import { ProbeVisual } from "@/components/probe/ProbeVisual";

export function LaunchSequence({ craft, stage }: { craft: Craft; stage: number }) {
  const labels = ["T−3", "T−2", "T−1", "IGNITION", "SIGNAL LOCKED"];
  return <div className={`launch-sequence ${stage === 3 ? "launch-shake" : ""}`} role="status" aria-live="polite"><div className="launch-vignette" /><div className="relative z-10 flex h-full flex-col items-center justify-center"><p className="control-kicker">Launch authority reluctantly granted</p><div className="h-72 w-72"><ProbeVisual craft={craft} launching={stage >= 3} /></div><p className="text-5xl font-black tracking-[.12em] text-white">{labels[stage] ?? labels.at(-1)}</p><p className="mt-3 text-sm uppercase tracking-[.3em] text-cyan-200">{craft.name} · please remain mostly assembled</p></div></div>;
}

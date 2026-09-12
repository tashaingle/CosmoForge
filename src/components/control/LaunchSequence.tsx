"use client";

import { useEffect, useRef, useState } from "react";
import type { Craft } from "@/lib/types";
import { ProbeVisual } from "@/components/probe/ProbeVisual";
import { HangarScene3D } from "@/components/three/HangarScene3D";

export function LaunchSequence({ craft, stage }: { craft: Craft; stage: number }) {
  const labels = ["T−3", "T−2", "T−1", "IGNITION", "SIGNAL LOCKED"];
  return <div className={`launch-sequence ${stage === 3 ? "launch-shake" : ""}`} role="status" aria-live="polite"><div className="launch-vignette" /><div className="relative z-10 flex h-full flex-col items-center justify-center"><p className="control-kicker">Launch authority reluctantly granted</p><div className="launch-three-window"><HangarScene3D craft={craft} phase="launch" stage={stage} fallback={<div className="h-72 w-72"><ProbeVisual craft={craft} launching={stage >= 3} /></div>} /></div><p className="text-5xl font-black tracking-[.12em] text-white">{labels[stage] ?? labels.at(-1)}</p><p className="mt-3 text-sm uppercase tracking-[.3em] text-cyan-200">{craft.name} · please remain mostly assembled</p></div></div>;
}

export function CinematicLaunch({ craft, onComplete }: { craft: Craft; onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const complete = useRef(onComplete);
  useEffect(() => { complete.current = onComplete; }, [onComplete]);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timings = reduced ? [80, 160, 240, 400] : [750, 1500, 2250, 3300];
    const timers = timings.map((delay, index) => window.setTimeout(() => setStage(index + 1), delay));
    timers.push(window.setTimeout(() => complete.current(), reduced ? 650 : 4300));
    return () => timers.forEach(window.clearTimeout);
  }, []);
  return <LaunchSequence craft={craft} stage={stage} />;
}

export function ReturnSequence({ craft, stage }: { craft: Craft; stage: number }) {
  const labels = ["INBOUND", "RAIL CONTACT", "DOORS CLOSING", "CLAMPS ENGAGED", "HANGAR SEALED"];
  return <div className="launch-sequence" role="status" aria-live="polite"><div className="launch-vignette" /><div className="relative z-10 flex h-full flex-col items-center justify-center"><p className="control-kicker">Return signal reluctantly accepted</p><div className="launch-three-window"><HangarScene3D craft={craft} phase="return" stage={stage} fallback={<div className="h-72 w-72"><ProbeVisual craft={craft} /></div>} /></div><p className="text-5xl font-black tracking-[.12em] text-white">{labels[stage] ?? labels.at(-1)}</p><p className="mt-3 text-sm uppercase tracking-[.3em] text-cyan-200">{craft.name} · somehow still in one piece</p></div></div>;
}

export function CinematicReturn({ craft, onComplete }: { craft: Craft; onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const complete = useRef(onComplete);
  useEffect(() => { complete.current = onComplete; }, [onComplete]);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timings = reduced ? [80, 160, 240, 400] : [750, 1500, 2250, 3300];
    const timers = timings.map((delay, index) => window.setTimeout(() => setStage(index + 1), delay));
    timers.push(window.setTimeout(() => complete.current(), reduced ? 650 : 4300));
    return () => timers.forEach(window.clearTimeout);
  }, []);
  return <ReturnSequence craft={craft} stage={stage} />;
}

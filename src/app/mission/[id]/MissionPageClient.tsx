"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MissionClient } from "@/components/mission/MissionClient";
import { getCraft } from "@/lib/storage";
import type { Craft } from "@/lib/types";

export function MissionPageClient({ craftId }: { craftId: string }) {
  const [craft, setCraft] = useState<Craft | null | undefined>(undefined);

  useEffect(() => {
    const c = getCraft(craftId);
    if (c?.status === "inflight" && c.orbit) {
      // Offline progress: advance from last saved sim time using wall clock
      const last = c.lastSimMs ?? c.launchedAt ?? Date.now();
      const wallDelta = Date.now() - (c.updatedAt || last);
      // Only apply modest offline catch-up so huge gaps don't jump years accidentally
      // User can still accelerate manually. Cap at 7 days of 1000x-equivalent wall? 
      // Simpler: store lastSimMs; on open, continue from lastSimMs (time paused offline)
      // For "keeps flying offline" fantasy: advance by wall clock at 1x
      const advanced: Craft = {
        ...c,
        lastSimMs: last + Math.max(0, Date.now() - (c.updatedAt ?? last)),
      };
      setCraft(advanced);
    } else {
      setCraft(c ?? null);
    }
  }, [craftId]);

  if (craft === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Acquiring signal…
      </div>
    );
  }

  if (!craft || !craft.orbit || craft.status !== "inflight") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <p>No active mission for this craft.</p>
        <Link href="/" className="text-cyan-400 hover:underline">
          Return to hangar
        </Link>
      </div>
    );
  }

  return <MissionClient craft={craft} />;
}

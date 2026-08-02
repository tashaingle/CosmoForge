"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MissionClient } from "@/components/mission/MissionClient";
import { getCraft } from "@/lib/storage";
import type { Craft } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { fetchCloudFleet } from "@/lib/cloud-fleet";
import { upsertCraft } from "@/lib/storage";
import { trackDailyOpenMission } from "@/lib/daily";

export function MissionPageClient({ craftId }: { craftId: string }) {
  const { ready, user, syncContext } = useAuth();
  const [craft, setCraft] = useState<Craft | null | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    try {
      trackDailyOpenMission();
    } catch {
      /* ignore */
    }

    async function load() {
      let c = getCraft(craftId);
      // If not local and signed in, try cloud
      if ((!c || c.status !== "inflight") && user) {
        const cloud = await fetchCloudFleet(user.id);
        const found = cloud.find((x) => x.id === craftId);
        if (found) {
          upsertCraft(found, syncContext);
          c = found;
        }
      }

      if (c?.status === "inflight" && c.orbit) {
        const last = c.lastSimMs ?? c.launchedAt ?? Date.now();
        const advanced: Craft = {
          ...c,
          lastSimMs: last + Math.max(0, Date.now() - (c.updatedAt ?? last)),
        };
        setCraft(advanced);
      } else {
        setCraft(c ?? null);
      }
    }

    void load();
  }, [craftId, ready, user, syncContext]);

  if (!ready || craft === undefined) {
    return <LoadingScreen label="Acquiring signal…" />;
  }

  if (!craft || !craft.orbit || craft.status !== "inflight") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-center text-slate-300">
        <p>No active mission for this craft.</p>
        <Link href="/#hangar" className="text-cyan-400 hover:underline">
          Return to hangar
        </Link>
      </div>
    );
  }

  return <MissionClient craft={craft} />;
}

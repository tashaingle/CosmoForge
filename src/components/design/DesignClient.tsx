"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShipBuilder } from "@/components/ship/ShipBuilder";
import { getCraft, upsertCraft } from "@/lib/storage";
import { computeStats } from "@/lib/ship";
import type { Craft } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export function DesignClient({ craftId }: { craftId: string }) {
  const { ready, syncContext } = useAuth();
  const [craft, setCraft] = useState<Craft | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setCraft(getCraft(craftId) ?? null);
  }, [craftId, ready]);

  if (!ready || craft === undefined) {
    return <LoadingScreen label="Loading design…" />;
  }

  if (craft === null) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-center text-slate-300">
        <p>Craft not found in this hangar.</p>
        <p className="text-sm text-slate-500">
          Sign in if it lives on another device.
        </p>
        <Link href="/#hangar" className="text-cyan-400 hover:underline">
          Back to hangar
        </Link>
      </div>
    );
  }

  if (craft.status === "inflight") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <p>This craft is already in flight.</p>
        <Link
          href={`/mission/${craft.id}`}
          className="text-cyan-400 hover:underline"
        >
          Open mission
        </Link>
      </div>
    );
  }

  const stats = computeStats(craft.partIds);

  function save(next: Craft) {
    upsertCraft(next, syncContext);
    setCraft(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/#hangar"
              className="text-sm text-slate-400 hover:text-cyan-300"
            >
              ← Hangar
            </Link>
            <h1 className="text-base font-semibold sm:text-lg">Ship designer</h1>
            {saved && (
              <span className="text-xs text-emerald-400">Saved</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => save(craft)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
            >
              Save
            </button>
            <Link
              href={stats.launchReady ? `/launch/${craft.id}` : "#"}
              onClick={(e) => {
                if (!stats.launchReady) e.preventDefault();
                else save(craft);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                stats.launchReady
                  ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  : "cursor-not-allowed bg-slate-700 text-slate-400"
              }`}
            >
              Launch
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <ShipBuilder
          name={craft.name}
          partIds={craft.partIds}
          onNameChange={(name) => setCraft({ ...craft, name })}
          onPartsChange={(partIds) => setCraft({ ...craft, partIds })}
        />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShipBuilder } from "@/components/ship/ShipBuilder";
import { getCraft, upsertCraft } from "@/lib/storage";
import { computeStats } from "@/lib/ship";
import type { Craft } from "@/lib/types";

export function DesignClient({ craftId }: { craftId: string }) {
  const [craft, setCraft] = useState<Craft | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = getCraft(craftId);
    setCraft(c ?? null);
  }, [craftId]);

  if (craft === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <p>Craft not found in this browser’s hangar.</p>
        <Link href="/" className="text-cyan-400 hover:underline">
          Back to hangar
        </Link>
      </div>
    );
  }

  if (craft.status === "inflight") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
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
    upsertCraft(next);
    setCraft(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-400 hover:text-cyan-300">
              ← Hangar
            </Link>
            <h1 className="text-lg font-semibold">Ship designer</h1>
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
              Save design
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
              Proceed to launch
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
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

"use client";

import { useEphemerisMeta } from "./EphemerisProvider";

export function EphemerisBadge({ compact = false }: { compact?: boolean }) {
  const meta = useEphemerisMeta();

  if (!meta.ready) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 ${
          compact ? "" : ""
        }`}
        title={meta.lastError || "Loading JPL Horizons…"}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" />
        Ephemeris…
      </span>
    );
  }

  const when = meta.generatedAt
    ? new Date(meta.generatedAt).toLocaleString()
    : "";

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200"
      title={`JPL Horizons bake · ${meta.bodyCount} bodies · ${when}${
        meta.errors.length ? ` · notes: ${meta.errors.join("; ")}` : ""
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {compact ? "JPL Horizons" : "Ephemeris: JPL Horizons"}
    </span>
  );
}

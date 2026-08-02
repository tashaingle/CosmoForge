"use client";

import {
  PARTS,
  canAddPart,
  computeStats,
  formatDeltaV,
  formatMass,
  getPart,
  type PartCategory,
  type PartDef,
} from "@/lib/ship";

const CATEGORIES: { id: PartCategory; label: string }[] = [
  { id: "bus", label: "Bus" },
  { id: "power", label: "Power" },
  { id: "propulsion", label: "Propulsion" },
  { id: "tank", label: "Tanks" },
  { id: "payload", label: "Payload" },
  { id: "comms", label: "Comms" },
];

interface Props {
  name: string;
  partIds: string[];
  onNameChange: (name: string) => void;
  onPartsChange: (partIds: string[]) => void;
}

export function ShipBuilder({
  name,
  partIds,
  onNameChange,
  onPartsChange,
}: Props) {
  const stats = computeStats(partIds);

  function addPart(part: PartDef) {
    if (!canAddPart(partIds, part.id)) return;
    // exclusive bus: replace existing bus
    if (part.exclusiveCategory) {
      const filtered = partIds.filter(
        (id) => getPart(id)?.category !== part.category
      );
      onPartsChange([...filtered, part.id]);
      return;
    }
    onPartsChange([...partIds, part.id]);
  }

  function removeAt(index: number) {
    onPartsChange(partIds.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
            Craft name
          </label>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-slate-50 outline-none ring-cyan-400/40 focus:ring-2"
            placeholder="Name your probe"
          />
        </div>

        {CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <h3 className="mb-2 text-sm font-medium text-cyan-200/90">
              {cat.label}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {PARTS.filter((p) => p.category === cat.id).map((part) => {
                const disabled = !canAddPart(partIds, part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    disabled={disabled && !part.exclusiveCategory}
                    onClick={() => addPart(part)}
                    className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-left transition hover:border-cyan-400/40 hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: part.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-100">
                          {part.name}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {part.description}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatMass(part.massKg)}
                          {part.propellantKg > 0 &&
                            ` · +${part.propellantKg} kg fuel`}
                          {part.ispSec > 0 && ` · Isp ${part.ispSec}s`}
                          {part.powerW !== 0 &&
                            ` · ${part.powerW > 0 ? "+" : ""}${part.powerW} W`}
                          {` · ${part.costCredits} cr`}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950 p-4 shadow-xl shadow-cyan-950/30">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
            Manifest
          </h3>
          {partIds.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No parts yet.</p>
          ) : (
            <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
              {partIds.map((id, i) => {
                const p = getPart(id);
                if (!p) return null;
                return (
                  <li
                    key={`${id}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-200">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: p.color }}
                      />
                      {p.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Flight budget
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Wet mass" value={formatMass(stats.wetMassKg)} />
            <Stat label="Dry mass" value={formatMass(stats.dryMassKg)} />
            <Stat label="Propellant" value={formatMass(stats.propellantKg)} />
            <Stat label="Δv" value={formatDeltaV(stats.deltaVms)} accent />
            <Stat
              label="Power net"
              value={`${stats.powerNetW >= 0 ? "+" : ""}${stats.powerNetW.toFixed(0)} W`}
            />
            <Stat label="Cost" value={`${stats.costCredits} cr`} />
            <Stat label="Isp" value={stats.ispSec ? `${stats.ispSec} s` : "—"} />
            <Stat
              label="Thrust"
              value={
                stats.thrustN >= 1
                  ? `${stats.thrustN.toFixed(0)} N`
                  : stats.thrustN > 0
                    ? `${stats.thrustN.toFixed(2)} N`
                    : "—"
              }
            />
          </dl>

          <div className="mt-4 space-y-1">
            {stats.issues.map((issue) => (
              <p key={issue} className="text-xs text-amber-300/90">
                ⚠ {issue}
              </p>
            ))}
            {stats.launchReady && (
              <p className="text-xs text-emerald-300">
                ✓ Launch-ready — good design matters.
              </p>
            )}
          </div>
        </div>

        <ShipSilhouette partIds={partIds} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-semibold tabular-nums ${
          accent ? "text-cyan-300" : "text-slate-100"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ShipSilhouette({ partIds }: { partIds: string[] }) {
  const parts = partIds.map(getPart).filter(Boolean) as PartDef[];
  return (
    <div className="rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_center,_#0f172a_0%,_#020617_70%)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Assembly preview
      </h3>
      <div className="mt-4 flex min-h-[140px] flex-wrap items-center justify-center gap-2">
        {parts.length === 0 ? (
          <span className="text-sm text-slate-500">Add modules…</span>
        ) : (
          parts.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              title={p.name}
              className="rounded-md border border-white/20 px-2 py-3 text-center text-[10px] font-medium text-white shadow-lg"
              style={{
                background: `linear-gradient(160deg, ${p.color}cc, ${p.color}55)`,
                minWidth: p.category === "bus" ? 72 : 48,
              }}
            >
              {p.category === "bus" ? "BUS" : p.name.split(" ")[0]}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

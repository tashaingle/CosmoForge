"use client";

import { useEffect, useState } from "react";
import type { VoyageDebrief } from "@/lib/types";
import { getLoot } from "@/lib/probe-loot";
import { getScar, getPersonality } from "@/lib/probe-personality";
import { catalogueLoot } from "@/lib/probe-loot";
import { loadWallet, saveWallet } from "@/lib/economy";
import { useAuth } from "@/components/auth/AuthProvider";

interface Props {
  debrief: VoyageDebrief;
  onClose: () => void;
}

export function DebriefModal({ debrief, onClose }: Props) {
  const { persistWallet, refreshWallet } = useAuth();
  const [claimed, setClaimed] = useState(false);
  const [creditGain, setCreditGain] = useState(0);
  const [newFinds, setNewFinds] = useState<string[]>([]);
  const personality = getPersonality(debrief.personalityId);

  useEffect(() => {
    // Auto-catalogue on open (once per mount)
    if (claimed) return;
    const { credits, newFinds: nf } = catalogueLoot(debrief.lootIds);
    if (credits > 0) {
      const w = loadWallet();
      w.credits += credits;
      saveWallet(w);
      void persistWallet(w);
      refreshWallet();
    }
    setCreditGain(credits);
    setNewFinds(nf.map((id) => getLoot(id).name));
    setClaimed(true);
  }, [debrief, claimed, persistWallet, refreshWallet]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal
      aria-labelledby="debrief-title"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-2xl shadow-cyan-500/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
          Debrief · the good part
        </p>
        <h2 id="debrief-title" className="mt-1 text-2xl font-bold text-white">
          {debrief.craftName} is home
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {debrief.missionName} · {personality.label}
        </p>

        <blockquote className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-cyan-50">
          “{debrief.opener}”
        </blockquote>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {debrief.summary}
        </p>

        <ul className="mt-4 space-y-2">
          {debrief.highlights.map((h) => (
            <li
              key={h}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
            >
              {h}
            </li>
          ))}
        </ul>

        {debrief.scarIds.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300/90">
              Permanent changes
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {debrief.scarIds.map((id) => {
                const s = getScar(id);
                return (
                  <span
                    key={id}
                    className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-100"
                    title={s.blurb}
                  >
                    {s.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {debrief.lootIds.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
              Cargo catalogued
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {debrief.lootIds.map((id) => {
                const l = getLoot(id);
                return (
                  <li key={id} className="flex justify-between gap-2">
                    <span>
                      {l.name}{" "}
                      <span className="text-xs text-slate-500">
                        ({l.rarity})
                      </span>
                    </span>
                    <span className="tabular-nums text-amber-200">
                      ✦ {l.creditValue}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {claimed && (
          <p className="mt-4 text-sm text-emerald-300">
            +✦ {creditGain} from finds
            {newFinds.length > 0
              ? ` · new to collection: ${newFinds.join(", ")}`
              : ""}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Back to the hangar
        </button>
      </div>
    </div>
  );
}

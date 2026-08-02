"use client";

import { useEffect, useState } from "react";
import type { VoyageDebrief } from "@/lib/types";
import { getLoot, catalogueDebriefOnce } from "@/lib/probe-loot";
import { getScar, getPersonality } from "@/lib/probe-personality";
import { loadWallet, saveWallet } from "@/lib/economy";
import { useAuth } from "@/components/auth/AuthProvider";
import { shareDebriefCard } from "@/lib/share-debrief";
import { getPreset } from "@/lib/quick-launch";
import { presetIdsUnlockedByLoot } from "@/lib/probe-unlocks";
import { ANALYSIS_COST, analyzeLoot } from "@/lib/probe-analysis";

interface Props {
  debrief: VoyageDebrief;
  onClose: () => void;
}

export function DebriefModal({ debrief, onClose }: Props) {
  const { persistWallet, refreshWallet } = useAuth();
  const [claimed, setClaimed] = useState(false);
  const [creditGain, setCreditGain] = useState(0);
  const [newFinds, setNewFinds] = useState<string[]>([]);
  const [unlockedLabels, setUnlockedLabels] = useState<string[]>([]);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [analysisNote, setAnalysisNote] = useState<string | null>(
    debrief.analysisNote ?? null
  );
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);
  const personality = getPersonality(debrief.personalityId);

  useEffect(() => {
    if (claimed) return;
    const key = debrief.craftId;
    const { credits, newFinds: nf, collection, alreadyClaimed } =
      catalogueDebriefOnce(key, debrief.lootIds);
    if (!alreadyClaimed && credits > 0) {
      const w = loadWallet();
      w.credits += credits;
      saveWallet(w);
      void persistWallet(w);
      refreshWallet();
    }
    setCreditGain(alreadyClaimed ? 0 : credits);
    setNewFinds(nf.map((id) => getLoot(id).name));
    if (nf.length > 0) {
      const ids = presetIdsUnlockedByLoot(nf, collection);
      setUnlockedLabels(
        ids.map((id) => {
          try {
            return getPreset(id as Parameters<typeof getPreset>[0]).label;
          } catch {
            return id;
          }
        })
      );
    }
    setClaimed(true);
  }, [debrief, claimed, persistWallet, refreshWallet]);

  async function onShare() {
    setSharing(true);
    setShareMsg(null);
    try {
      const { url, copied } = await shareDebriefCard(debrief);
      setShareMsg(copied ? "Link copied — send it to a friend" : url);
    } catch {
      setShareMsg("Could not share");
    } finally {
      setSharing(false);
    }
  }

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
          {debrief.relationshipLabel
            ? ` · ${debrief.relationshipLabel}`
            : ""}
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

        {claimed && creditGain > 0 && (
          <p className="mt-4 text-sm text-emerald-300">
            +✦ {creditGain} from finds
            {newFinds.length > 0
              ? ` · new: ${newFinds.join(", ")}`
              : ""}
          </p>
        )}
        {claimed && creditGain === 0 && (
          <p className="mt-4 text-xs text-slate-500">Already catalogued</p>
        )}

        {unlockedLabels.length > 0 && (
          <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
              New odd jobs unlocked
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-violet-50">
              {unlockedLabels.map((label) => (
                <li key={label}>✦ {label}</li>
              ))}
            </ul>
          </div>
        )}

        {analysisNote && (
          <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-950/30 px-4 py-3 text-sm text-amber-50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Analysis
            </p>
            <p className="mt-1">{analysisNote}</p>
          </div>
        )}

        {!analysisNote && (
          <button
            type="button"
            onClick={() => {
              setAnalysisErr(null);
              const res = analyzeLoot(debrief.lootIds, debrief.craftId);
              if (!res.ok) {
                setAnalysisErr(res.error ?? "Analysis failed");
                return;
              }
              setAnalysisNote(res.note ?? "Done.");
              refreshWallet();
            }}
            className="mt-4 w-full rounded-xl border border-amber-400/30 bg-amber-500/10 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-500/20"
          >
            Examine cargo (✦ {ANALYSIS_COST}) — maybe a mystery
          </button>
        )}
        {analysisErr && (
          <p className="mt-2 text-xs text-rose-300">{analysisErr}</p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={sharing}
            onClick={() => void onShare()}
            className="flex-1 rounded-xl border border-cyan-400/40 bg-cyan-500/15 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {sharing ? "Sharing…" : "Share debrief card"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Back to hangar
          </button>
        </div>
        {shareMsg && (
          <p className="mt-2 break-all text-center text-xs text-cyan-300/90">
            {shareMsg}
          </p>
        )}
      </div>
    </div>
  );
}

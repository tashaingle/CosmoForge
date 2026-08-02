"use client";

import Link from "next/link";
import { useMemo } from "react";
import { decodeDebriefShare } from "@/lib/share-debrief";
import { getLoot } from "@/lib/probe-loot";
import { getScar, getPersonality } from "@/lib/probe-personality";

export function DebriefShareClient({ token }: { token: string }) {
  const payload = useMemo(() => decodeDebriefShare(token), [token]);

  if (!payload) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-center text-slate-300">
        <p>This debrief link is invalid or expired.</p>
        <Link href="/" className="text-cyan-400 hover:underline">
          Launch your own weirdo →
        </Link>
      </div>
    );
  }

  const d = payload.debrief;
  const personality = getPersonality(d.personalityId);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#5b21b628_0%,_transparent_50%),radial-gradient(ellipse_at_bottom,_#0e749020_0%,_#020617_60%)]" />

      <div className="relative mx-auto max-w-lg px-4 py-10 sm:py-16">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-300/90">
          CosmoForge · debrief card
        </p>

        <article className="mt-6 overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-2xl shadow-cyan-500/10">
          <div className="border-b border-white/10 bg-black/40 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
              Mission complete
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {d.craftName} is home
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {d.missionName} · {personality.label}
            </p>
          </div>

          <div className="space-y-4 px-5 py-5">
            <blockquote className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base leading-relaxed text-cyan-50">
              “{d.opener}”
            </blockquote>

            <p className="text-sm leading-relaxed text-slate-400">{d.summary}</p>

            <ul className="space-y-2">
              {d.highlights.map((h) => (
                <li
                  key={h}
                  className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200"
                >
                  {h}
                </li>
              ))}
            </ul>

            {d.scarIds.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300/90">
                  Changed forever
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.scarIds.map((id) => {
                    const s = getScar(id);
                    return (
                      <span
                        key={id}
                        className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-100"
                      >
                        {s.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {d.lootIds.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
                  What they brought
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {d.lootIds.map((id) => {
                    const l = getLoot(id);
                    return (
                      <li key={id}>
                        {l.name}{" "}
                        <span className="text-xs text-slate-500">
                          ({l.rarity})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/50 px-5 py-4 text-center">
            <p className="text-xs text-slate-500">
              Little ships with big personalities
            </p>
            <Link
              href="/"
              className="mt-3 inline-flex rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Launch your own weirdo
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

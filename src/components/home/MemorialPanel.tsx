"use client";

import { useMemo, useState } from "react";
import { loadLastMessages, loadMemorials } from "@/lib/probe-memorial";
import { getPersonality } from "@/lib/probe-personality";

export function MemorialPanel() {
  const [open, setOpen] = useState(false);
  const memorials = useMemo(() => loadMemorials(), [open]);
  const lasts = useMemo(() => loadLastMessages(), [open]);

  if (memorials.length === 0 && lasts.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Hall of retired craft
          </p>
          <h2 className="text-lg font-semibold text-white">
            Memorials · last messages
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {memorials.length} plaques · {lasts.length} final transmissions
          </p>
        </div>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 px-4 pb-5 pt-4 sm:px-5">
          {memorials.length > 0 && (
            <ul className="space-y-2">
              {memorials.map((m) => (
                <li
                  key={m.craftId + m.retiredAt}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-3"
                >
                  <p className="font-medium text-white">{m.name}</p>
                  <p className="mt-1 text-sm italic text-slate-300">
                    “{m.plaque}”
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {m.personalityId
                      ? getPersonality(m.personalityId).label
                      : "Probe"}{" "}
                    · {m.voyagesCompleted} voyages
                    {m.lastMessage ? " · had last words" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {lasts.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300/90">
                Collectible last messages
              </p>
              <ul className="mt-2 space-y-2">
                {lasts.map((msg) => (
                  <li
                    key={msg.craftId + msg.atMs}
                    className="rounded-lg border border-rose-400/20 bg-rose-950/20 px-3 py-2 text-sm text-rose-50/90"
                  >
                    <span className="font-medium text-rose-200">
                      {msg.craftName}:
                    </span>{" "}
                    {msg.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

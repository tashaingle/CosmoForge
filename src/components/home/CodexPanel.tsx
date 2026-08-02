"use client";

import { useMemo, useState } from "react";
import {
  LOOT_CATALOG,
  loadCollection,
  type LootRarity,
} from "@/lib/probe-loot";
import { computeAgencyTitles } from "@/lib/probe-titles";

function rarityBucket(r: LootRarity): "science" | "strange" {
  return r === "rare" || r === "cursed" ? "strange" : "science";
}

export function CodexPanel() {
  const [open, setOpen] = useState(false);
  const collection = useMemo(() => loadCollection(), [open]);
  const titles = useMemo(() => computeAgencyTitles(), [open]);

  const science = LOOT_CATALOG.filter((l) => rarityBucket(l.rarity) === "science");
  const strange = LOOT_CATALOG.filter((l) => rarityBucket(l.rarity) === "strange");

  const foundOf = (list: typeof LOOT_CATALOG) =>
    list.filter((l) => (collection.found[l.id] ?? 0) > 0).length;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
            Codex · agency title
          </p>
          <h2 className="text-lg font-semibold text-white">
            {titles.active.title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">{titles.active.blurb}</p>
          <p className="mt-1 text-xs text-slate-500">
            Science {foundOf(science)}/{science.length} · Strange{" "}
            {foundOf(strange)}/{strange.length}
          </p>
        </div>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 px-4 pb-5 pt-4 sm:px-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Titles unlocked
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {titles.unlocked.map((t) => (
                <li
                  key={t.id}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                  title={t.blurb}
                >
                  {t.title}
                </li>
              ))}
            </ul>
          </div>

          <CodexColumn
            title="Normal science"
            items={science}
            found={collection.found}
          />
          <CodexColumn
            title="Things that shouldn’t be possible"
            items={strange}
            found={collection.found}
            weird
          />
        </div>
      )}
    </section>
  );
}

function CodexColumn({
  title,
  items,
  found,
  weird,
}: {
  title: string;
  items: typeof LOOT_CATALOG;
  found: Record<string, number>;
  weird?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-[10px] font-semibold uppercase tracking-wider ${
          weird ? "text-violet-300/90" : "text-emerald-300/90"
        }`}
      >
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((l) => {
          const n = found[l.id] ?? 0;
          const have = n > 0;
          return (
            <li
              key={l.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                have
                  ? "border-white/10 bg-white/5 text-slate-200"
                  : "border-white/5 bg-black/20 text-slate-600"
              }`}
            >
              <span className="font-medium">
                {have ? l.name : "????????????"}
              </span>
              {have && (
                <span className="mt-0.5 block text-xs text-slate-500">
                  {l.blurb} · ×{n}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

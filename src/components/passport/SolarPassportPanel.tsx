"use client";

import { useEffect, useState } from "react";
import { PASSPORT_BODIES } from "@/lib/bodies";
import {
  loadPassport,
  passportStats,
  type SolarPassport,
} from "@/lib/passport";

export function SolarPassportPanel() {
  const [passport, setPassport] = useState<SolarPassport | null>(null);

  useEffect(() => {
    setPassport(loadPassport());
    const id = window.setInterval(() => setPassport(loadPassport()), 4000);
    return () => clearInterval(id);
  }, []);

  if (!passport) return null;
  const stats = passportStats(passport);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">Solar passport</h3>
          <p className="mt-1 text-sm text-slate-400">
            Fly near worlds to stamp them. This is why you come back — fill the
            map of the real solar system.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-cyan-300">
            {stats.found}
            <span className="text-base text-slate-500">/{stats.total}</span>
          </p>
          <p className="text-xs text-slate-500">{stats.percent}% explored</p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
          style={{ width: `${stats.percent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {PASSPORT_BODIES.map((b) => {
          const found = Boolean(passport.discovered[b.id]);
          return (
            <div
              key={b.id}
              className={`rounded-xl border px-2.5 py-2 ${
                found
                  ? "border-cyan-400/30 bg-cyan-500/10"
                  : "border-white/5 bg-white/[0.02] opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: found ? b.color : "#475569" }}
                />
                <span
                  className={`text-xs font-medium ${
                    found ? "text-white" : "text-slate-500"
                  }`}
                >
                  {found ? b.name : "???"}
                </span>
              </div>
              <p className="mt-1 text-[10px] capitalize text-slate-500">
                {b.kind}
                {found ? " · stamped" : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

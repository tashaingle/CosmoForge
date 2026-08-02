"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MissionClient } from "@/components/mission/MissionClient";
import { decodeShare } from "@/lib/storage";

export function SharePageClient({ token }: { token: string }) {
  const payload = useMemo(() => decodeShare(token), [token]);

  if (!payload?.craft?.orbit) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <p>This share link is invalid or expired.</p>
        <Link href="/" className="text-cyan-400 hover:underline">
          Build your own craft
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <MissionClient craft={payload.craft} readOnly />
      <div className="fixed bottom-20 right-4 z-20">
        <Link
          href="/"
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg hover:bg-cyan-400"
        >
          Play CosmoForge
        </Link>
      </div>
    </div>
  );
}

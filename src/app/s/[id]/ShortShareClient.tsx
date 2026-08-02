"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MissionClient } from "@/components/mission/MissionClient";
import type { Craft } from "@/lib/types";

export function ShortShareClient({ id }: { id: string }) {
  const [craft, setCraft] = useState<Craft | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/shares/${id}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (!cancelled) {
            setError(body.error || "Share not found");
            setCraft(null);
          }
          return;
        }
        const body = (await res.json()) as { craft: Craft };
        if (!cancelled) setCraft(body.craft);
      } catch {
        if (!cancelled) {
          setError("Could not load share");
          setCraft(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (craft === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading shared mission…
      </div>
    );
  }

  if (!craft?.orbit || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <p>{error || "This shared mission is unavailable."}</p>
        <Link href="/" className="text-cyan-400 hover:underline">
          Build your own craft
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <MissionClient craft={craft} readOnly />
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

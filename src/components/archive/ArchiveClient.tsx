"use client";

import Link from "next/link";
import { CodexPanel } from "@/components/home/CodexPanel";
import { MemorialPanel } from "@/components/home/MemorialPanel";
import { SolarPassportPanel } from "@/components/passport/SolarPassportPanel";

export function ArchiveClient() {
  return <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#312e8140,#020617_48%)] px-4 py-8 text-slate-100">
    <div className="mx-auto max-w-5xl"><header className="mb-10 flex items-start justify-between gap-4"><div><p className="control-kicker">Records annex · mildly haunted</p><h1 className="mt-2 text-4xl font-black text-white">ARCHIVE</h1><p className="mt-2 max-w-xl text-slate-400">Every stamp, strange object, retired friend and transmission we could not quite delete.</p></div><Link href="/" className="control-secondary">Return to control</Link></header><div className="grid gap-7 lg:grid-cols-2"><div className="lg:col-span-2"><SolarPassportPanel /></div><CodexPanel /><MemorialPanel /></div></div>
  </main>;
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { EphemerisBadge } from "@/components/ephemeris/EphemerisBadge";
import { InlineSpinner } from "./LoadingScreen";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  const {
    user,
    displayName,
    configured,
    cloudSyncing,
    cloudSynced,
    wallet,
    signOut,
  } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-md ${
          compact ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="group flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20">
              ✦
            </span>
            <span className="font-semibold tracking-tight text-white group-hover:text-cyan-200">
              CosmoForge
            </span>
            <span className="hidden rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 sm:inline">
              Alpha
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline">
              <EphemerisBadge compact />
            </span>
            <a
              href="/#shop"
              className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold tabular-nums text-amber-200 hover:bg-amber-500/20 sm:px-2.5 sm:text-xs"
              title="Credits & shop"
            >
              ✦ {wallet.credits}
            </a>
            <a
              href="/#market"
              className="hidden rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5 sm:inline sm:text-xs"
            >
              Market
            </a>
            {cloudSyncing && (
              <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
                <InlineSpinner /> Syncing
              </span>
            )}
            {user && cloudSynced && !cloudSyncing && (
              <span className="hidden text-xs text-emerald-400/80 sm:inline">
                Cloud hangar
              </span>
            )}
            {user ? (
              <>
                <span className="max-w-[120px] truncate text-xs text-slate-400 sm:max-w-[180px] sm:text-sm">
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5 sm:text-sm"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 sm:text-sm"
              >
                {configured ? "Sign in" : "Local mode"}
              </button>
            )}
          </div>
        </div>
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

"use client";

export function LoadingScreen({
  label = "Loading CosmoForge…",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-cyan-500/10" />
        <div className="absolute inset-[18px] rounded-full bg-cyan-400/80 shadow-[0_0_20px_#22d3ee]" />
      </div>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function InlineSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400 ${className}`}
      aria-hidden
    />
  );
}

"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: Props) {
  const { signInWithEmail, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setMessage("");
    const res = await signInWithEmail(email);
    if (res.error) {
      setStatus("error");
      setMessage(res.error);
      return;
    }
    setStatus("sent");
    setMessage("Check your email for a magic link. You can close this window.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative m-0 w-full max-w-md rounded-t-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl sm:m-4 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Sign in to sync your fleet
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Magic link — no password. Your hangar follows you across devices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        {!configured ? (
          <p className="text-sm text-amber-300">
            Cloud auth isn&apos;t configured on this environment yet. You can
            still play with a local hangar.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-xs uppercase tracking-wider text-slate-500">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
              />
            </label>
            <button
              type="submit"
              disabled={status === "sending" || status === "sent"}
              className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {status === "sending"
                ? "Sending link…"
                : status === "sent"
                  ? "Link sent"
                  : "Email me a magic link"}
            </button>
            {message && (
              <p
                className={`text-sm ${
                  status === "error" ? "text-rose-300" : "text-emerald-300"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

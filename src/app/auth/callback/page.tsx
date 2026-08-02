"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Supabase is not configured.");
      return;
    }

    // PKCE / implicit tokens in URL are picked up by detectSessionInUrl
    sb.auth.getSession().then(({ data, error: err }) => {
      if (err) {
        setError(err.message);
        return;
      }
      if (data.session) {
        router.replace("/#hangar");
        return;
      }
      // Hash tokens (older flow)
      const hash = window.location.hash;
      if (hash.includes("access_token") || hash.includes("error")) {
        // give client a moment to parse hash
        setTimeout(() => {
          sb.auth.getSession().then(({ data: d2 }) => {
            if (d2.session) router.replace("/#hangar");
            else setError("Could not complete sign-in. Try again.");
          });
        }, 400);
        return;
      }
      setError("No session found. Request a new magic link.");
    });
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-center">
        <p className="text-rose-300">{error}</p>
        <a href="/" className="text-cyan-400 hover:underline">
          Back to CosmoForge
        </a>
      </div>
    );
  }

  return <LoadingScreen label="Signing you in…" />;
}

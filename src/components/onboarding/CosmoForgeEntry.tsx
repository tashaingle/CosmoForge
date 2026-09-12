"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { loadFleet } from "@/lib/storage";
import { shouldShowOnboarding } from "@/lib/onboarding";
import { ControlClient } from "@/components/control/ControlClient";
import { FirstProbeOnboarding } from "./FirstProbeOnboarding";

export function CosmoForgeEntry() {
  const { ready } = useAuth();
  const [onboarding, setOnboarding] = useState<boolean | null>(null);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setOnboarding(shouldShowOnboarding(loadFleet())), 0);
    return () => window.clearTimeout(timer);
  }, [ready]);
  if (!ready || onboarding === null) return <LoadingScreen label="Checking Hangar 3 for suspicious noises…" />;
  return onboarding ? <FirstProbeOnboarding onComplete={() => setOnboarding(false)} /> : <ControlClient />;
}

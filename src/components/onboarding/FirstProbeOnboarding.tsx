"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProbeVisual } from "@/components/probe/ProbeVisual";
import { PersonalityChoice } from "./PersonalityChoice";
import { CinematicLaunch } from "@/components/control/LaunchSequence";
import { MissionStage } from "@/components/control/MissionStage";
import { TransmissionsPanel } from "@/components/control/TransmissionsPanel";
import { DebriefModal } from "@/components/home/DebriefModal";
import { createCraft, deleteCraft, getCraft, upsertCraft } from "@/lib/storage";
import { generateProbeName, getPersonality, type PersonalityId } from "@/lib/probe-personality";
import { quickLaunch } from "@/lib/quick-launch";
import { advanceVoyageStory, isReadyToReturn, returnProbe } from "@/lib/probe-voyage";
import { resolveTransmissionChoice } from "@/game/transmissions";
import type { EncounterChoiceId } from "@/game/encounters";
import { beginOnboarding, completeOnboarding, endDevelopmentReplay, isDevelopmentReplay, loadOnboarding } from "@/lib/onboarding";
import type { Craft, VoyageDebrief } from "@/lib/types";

type IntroStep = "meet" | "name" | "personality" | "ready";

function savedOnboardingCraft(): Craft | null {
  const id = loadOnboarding()?.craftId;
  return id ? getCraft(id) ?? null : null;
}

export function FirstProbeOnboarding({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const { syncContext } = useAuth();
  const [existing] = useState(savedOnboardingCraft);
  const [preview] = useState(() => createCraft(generateProbeName()));
  const [name, setName] = useState(existing?.name ?? preview.name);
  const [personality, setPersonality] = useState<PersonalityId | null>(existing?.personalityId ?? null);
  const [introStep, setIntroStep] = useState<IntroStep>(existing ? "ready" : "meet");
  const [craft, setCraft] = useState<Craft | null>(existing);
  const [launching, setLaunching] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [debrief, setDebrief] = useState<VoyageDebrief | null>(existing?.status === "complete" ? existing.lastDebrief ?? null : null);
  const [error, setError] = useState<string | null>(null);
  const [devReplay] = useState(isDevelopmentReplay);
  const craftId = craft?.id;
  const craftStatus = craft?.status;

  useEffect(() => {
    if (!loadOnboarding()) beginOnboarding();
  }, []);

  useEffect(() => {
    if (!craftId || craftStatus !== "inflight" || launching) return;
    const update = () => {
      const current = getCraft(craftId);
      if (!current) return;
      const result = advanceVoyageStory(current, Date.now());
      const changed = result.newPings.length > 0 || result.craft.readyToReturn !== current.readyToReturn;
      if (changed) upsertCraft(result.craft, devReplay ? undefined : syncContext);
      setCraft(result.craft);
      setNow(Date.now());
    };
    const start = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    return () => { window.clearTimeout(start); window.clearInterval(interval); };
  }, [craftId, craftStatus, launching, devReplay, syncContext]);

  const finishLaunch = useCallback(() => setLaunching(false), []);

  function launchFirstProbe() {
    if (!personality) return;
    setError(null);
    const result = quickLaunch("leo_scout", devReplay ? undefined : syncContext, { name: name.trim() || preview.name, personalityId: personality });
    if (!result.ok || !result.craft) { setError(result.error ?? "The launch rail has developed opinions."); return; }
    const launchedAt = result.craft.launchedAt ?? Date.now();
    const firstProbe: Craft = {
      ...result.craft,
      onboardingMission: true,
      expectedReturnAt: launchedAt + 75_000,
      memory: devReplay ? { dev_replay: true } : {},
      pings: [{ id: "depart", atMs: launchedAt, kind: "chat", text: `${result.craft.name} has cleared the launch rail. Nobody mention the loose-looking screw.` }],
    };
    upsertCraft(firstProbe, devReplay ? undefined : syncContext);
    beginOnboarding(firstProbe.id);
    setCraft(firstProbe);
    setLaunching(true);
  }

  function choose(pingId: string, choiceId: EncounterChoiceId) {
    if (!craft) return;
    const next = resolveTransmissionChoice(craft, pingId, choiceId, devReplay ? undefined : syncContext);
    if (next) setCraft(next);
  }

  function callHome() {
    if (!craft) return;
    const result = returnProbe(craft.id, devReplay ? undefined : syncContext);
    if (!result.ok || !result.craft || !result.debrief) { setError(result.error ?? "Return signal slipped under a cupboard."); return; }
    setCraft(result.craft);
    setDebrief(result.debrief);
  }

  function finish(destination: "control" | "again" | "view") {
    completeOnboarding();
    if (devReplay && craft) { deleteCraft(craft.id); endDevelopmentReplay(); }
    if (destination === "again" && craft && !devReplay) router.push(`/launch/${craft.id}`);
    else if (destination === "view" && craft && !devReplay) router.push(`/design/${craft.id}`);
    else onComplete();
  }

  const shownProbe = craft ?? { ...preview, name, personalityId: personality ?? "anxious" };
  if (launching && craft) return <CinematicLaunch craft={craft} onComplete={finishLaunch} />;
  if (debrief && craft) return <DebriefModal debrief={debrief} onClose={() => finish("control")} actions={{ primaryLabel: `Send ${craft.name} out again`, onPrimary: () => finish("again"), viewLabel: `View ${craft.name}`, onView: () => finish("view") }} />;

  if (craft?.status === "inflight") return <main className="onboarding-mission"><header><p className="control-kicker">Definitely safe test flight</p><p>One probe. One orbit. One warranty violation.</p></header><div className="onboarding-mission-grid"><MissionStage craft={craft} now={now} onReturn={callHome} /><TransmissionsPanel craft={craft} onChoice={choose} /></div>{isReadyToReturn(craft, now) && <button type="button" className="control-primary onboarding-return" onClick={callHome}>Acquire return signal</button>}{error && <p role="alert" className="text-rose-300">{error}</p>}</main>;

  return <main className="first-probe-onboarding"><div className="onboarding-hangar-light" /><section className="onboarding-probe"><ProbeVisual craft={shownProbe} /></section><section className="onboarding-copy">
    {introStep === "meet" && <><p className="control-kicker">Unregistered signal detected</p><h1>We found this behind a crate in Hangar 3.</h1><p>Its warranty expired before you were born.</p><blockquote>“It says its name is <strong>{name}</strong>.”</blockquote><div className="onboarding-actions"><button type="button" className="control-primary" onClick={() => setIntroStep("personality")}>Keep name</button><button type="button" className="debrief-minor" onClick={() => setIntroStep("name")}>Rename</button></div></>}
    {introStep === "name" && <><p className="control-kicker">Identity plate printer</p><h1>What should we call it?</h1><input aria-label="Probe name" value={name} maxLength={32} autoFocus onChange={(event) => setName(event.target.value)} /><p className="onboarding-aside">It is pretending not to care. Telemetry suggests otherwise.</p><button type="button" className="control-primary" disabled={!name.trim()} onClick={() => setIntroStep("personality")}>Stamp the plate</button></>}
    {introStep === "personality" && <><p className="control-kicker">Personality calibration</p><h1>One dial appears to control the entire personality.</h1><p>This seems like poor engineering. Choose anyway.</p><PersonalityChoice selected={personality} onSelect={setPersonality} />{personality && <button type="button" className="control-primary" onClick={() => setIntroStep("ready")}>Accept this personality</button>}</>}
    {introStep === "ready" && personality && <><p className="control-kicker">Calibration complete · {getPersonality(personality).label}</p><h1>{name} would like to leave immediately.</h1><blockquote>“{personality === "anxious" ? "Excellent. You've selected anxiety." : personality === "dramatic" ? "I knew you would recognise greatness." : "Perfect. I have already touched three things."}”</blockquote><div className="mission-ticket"><span>First assignment</span><strong>Definitely Safe Test Flight</strong><small>Estimated duration: 75 seconds · Risk classification: reassuringly vague</small></div><button type="button" className="control-primary" onClick={launchFirstProbe}>Launch {name}</button><button type="button" className="onboarding-back" onClick={() => setIntroStep("personality")}>Recalibrate personality</button></>}
    {error && <p role="alert" className="text-rose-300">{error}</p>}
  </section></main>;
}

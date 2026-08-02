/**
 * Voyage life: pings while away, scars, loot, return & debrief.
 * Travel is mostly automatic — the game peaks on return.
 */

import type { Craft, ProbePing, VoyageDebrief } from "./types";
import type { MissionProfileId } from "./orbital";
import { MISSION_PROFILES } from "./orbital";
import {
  fillPing,
  getPersonality,
  getScar,
  pickLine,
  type PersonalityId,
  type ScarId,
} from "./probe-personality";
import { getLoot, type LootId } from "./probe-loot";
import {
  getCraft,
  loadFleet,
  upsertCraft,
  type SyncContext,
} from "./storage";

/** Real-time mission length until “ready to come home” (play-tuned) */
export function voyageDurationMs(missionId?: MissionProfileId): number {
  switch (missionId) {
    case "leo":
      return 3 * 60 * 1000; // 3 min real — short odd job
    case "lunar":
      return 12 * 60 * 1000;
    case "mars_transfer":
    case "asteroid_belt":
      return 30 * 60 * 1000;
    case "venus_flyby":
    case "mercury_scout":
      return 35 * 60 * 1000;
    default:
      if (missionId?.startsWith("event_")) return 12 * 60 * 1000;
      return 25 * 60 * 1000;
  }
}

export function voyageProgress(craft: Craft, now = Date.now()): number {
  if (craft.status !== "inflight" || !craft.launchedAt) return 0;
  const dur = voyageDurationMs(craft.missionId);
  return Math.min(1, (now - craft.launchedAt) / dur);
}

export function isReadyToReturn(craft: Craft, now = Date.now()): boolean {
  if (craft.status !== "inflight") return false;
  if (craft.readyToReturn) return true;
  return voyageProgress(craft, now) >= 1;
}

const EVENT_SNIPPETS: { tag: string; scar?: ScarId; loot?: LootId; weight: number }[] = [
  { tag: "a boring but perfect systems check", loot: "noise_sample", weight: 3 },
  { tag: "an unreasonably pretty Earthrise", loot: "pretty_earthrise", weight: 2 },
  { tag: "a dust kiss on the starboard panel", loot: "dust_smudge", scar: "rattles", weight: 2 },
  { tag: "a spectrum so normal it was suspicious", loot: "boring_spectrum", weight: 2 },
  { tag: "a reading that made the instrument blink twice", loot: "suspicious_reading", weight: 1 },
  { tag: "a cold spot with opinions", loot: "cold_spot", weight: 1 },
  { tag: "static that almost said hello", loot: "radio_whisper", weight: 1 },
  { tag: "a solar hiccup", loot: "storm_souvenir", scar: "scorched", weight: 1 },
  { tag: "first useful light on the imager", loot: "first_light", weight: 2 },
  { tag: "an unscheduled feeling", loot: "unscheduled_emotion", scar: "overshares", weight: 1 },
  { tag: "an unauthorized essay about Venus", loot: "venus_fanfic", scar: "venus_obsessed", weight: 1 },
  { tag: "a coordinate that refuses to sit still", loot: "map_that_lies", weight: 1 },
  { tag: "a nothing that felt like company", loot: "friend_shaped_void", scar: "quiet_now", weight: 1 },
  { tag: "a bolt that should have left", loot: "lucky_bolt", scar: "lucky", weight: 1 },
  { tag: "eclipse panic (brief)", scar: "afraid_of_dark", loot: "bent_antenna_tip", weight: 1 },
  { tag: "a thruster with main-character energy", scar: "limps", weight: 1 },
];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickWeighted(
  seed: number
): (typeof EVENT_SNIPPETS)[number] {
  const rand = (seed % 10000) / 10000;
  const total = EVENT_SNIPPETS.reduce((a, e) => a + e.weight, 0);
  let t = rand * total;
  for (const e of EVENT_SNIPPETS) {
    t -= e.weight;
    if (t <= 0) return e;
  }
  return EVENT_SNIPPETS[0];
}

/**
 * Advance voyage story while offline / on home open.
 * Generates pings and marks readyToReturn.
 */
export function advanceVoyageStory(
  craft: Craft,
  now = Date.now()
): { craft: Craft; newPings: ProbePing[] } {
  if (craft.status !== "inflight" || !craft.launchedAt) {
    return { craft, newPings: [] };
  }

  const personalityId: PersonalityId =
    craft.personalityId ?? "chipper";
  const personality = getPersonality(personalityId);
  const pings = [...(craft.pings ?? [])];
  const newPings: ProbePing[] = [];
  const loot = new Set<LootId>(craft.cargoLootIds ?? []);
  const scars = new Set<ScarId>(craft.scarIds ?? []);

  const launched = craft.launchedAt;
  const dur = voyageDurationMs(craft.missionId);
  // Up to 4 story beats across the voyage
  const beatCount = 4;
  for (let i = 0; i < beatCount; i++) {
    const beatAt = launched + ((i + 1) / (beatCount + 1)) * dur;
    if (now < beatAt) break;
    const id = `beat-${i}`;
    if (pings.some((p) => p.id === id)) continue;

    const seed = hashSeed(craft.id + id);
    const ev = pickWeighted(seed + i * 17);
    const line = fillPing(
      pickLine(personality.pingTemplates, seed),
      ev.tag
    );
    const ping: ProbePing = {
      id,
      atMs: beatAt,
      text: line,
      kind: i === beatCount - 1 ? "milestone" : "chat",
    };
    pings.push(ping);
    newPings.push(ping);
    if (ev.loot) loot.add(ev.loot);
    if (ev.scar) scars.add(ev.scar);
  }

  // Arrival ping
  const ready = now >= launched + dur;
  let readyToReturn = craft.readyToReturn ?? false;
  if (ready && !pings.some((p) => p.id === "ready")) {
    const seed = hashSeed(craft.id + "ready");
    const ping: ProbePing = {
      id: "ready",
      atMs: launched + dur,
      text: pickLine(personality.returnLines, seed),
      kind: "return",
    };
    pings.push(ping);
    newPings.push(ping);
    readyToReturn = true;
    // Guarantee at least one loot
    if (loot.size === 0) loot.add("noise_sample");
  } else if (ready) {
    readyToReturn = true;
  }

  const next: Craft = {
    ...craft,
    personalityId,
    pings: pings.sort((a, b) => a.atMs - b.atMs),
    cargoLootIds: [...loot],
    scarIds: [...scars],
    readyToReturn,
    expectedReturnAt: launched + dur,
  };

  return { craft: next, newPings };
}

export function buildDebrief(craft: Craft): VoyageDebrief {
  const personality = getPersonality(craft.personalityId ?? "chipper");
  const seed = hashSeed(craft.id + "debrief");
  const mission = MISSION_PROFILES.find((m) => m.id === craft.missionId);
  const lootIds = craft.cargoLootIds ?? [];
  const scarIds = craft.scarIds ?? [];

  const highlights = [
    ...lootIds.slice(0, 3).map((id) => {
      const l = getLoot(id);
      return `Brought back: ${l.name} — ${l.blurb}`;
    }),
    ...scarIds.slice(0, 2).map((id) => {
      const s = getScar(id);
      return `Changed: ${s.label}. ${s.blurb}`;
    }),
  ];
  if (highlights.length === 0) {
    highlights.push("Brought back: residual stubbornness. Not catalogued.");
  }

  return {
    craftId: craft.id,
    craftName: craft.name,
    missionName: mission?.name ?? "Odd job",
    opener: pickLine(personality.debriefOpeners, seed),
    summary: `${craft.name} (${personality.label}) finished ${mission?.name ?? "a trip"}. Travel was mostly automatic. The interesting part is what came back.`,
    highlights,
    lootIds,
    scarIds,
    personalityId: personality.id,
  };
}

/** Call home — complete voyage, status → complete, stash debrief */
export function returnProbe(
  craftId: string,
  sync?: SyncContext
): { ok: boolean; craft?: Craft; debrief?: VoyageDebrief; error?: string } {
  let craft = getCraft(craftId);
  if (!craft) return { ok: false, error: "Probe not found" };
  if (craft.status !== "inflight") {
    return { ok: false, error: "Not out on a voyage" };
  }

  // Ensure story is fully generated
  const advanced = advanceVoyageStory(craft);
  craft = advanced.craft;

  if (!isReadyToReturn(craft)) {
    const left = (craft.expectedReturnAt ?? Date.now()) - Date.now();
    const mins = Math.max(1, Math.ceil(left / 60000));
    return {
      ok: false,
      error: `Still out there (~${mins}m). They’ll ping when ready.`,
    };
  }

  const debrief = buildDebrief(craft);
  const next: Craft = {
    ...craft,
    status: "complete",
    readyToReturn: false,
    lastDebrief: debrief,
    updatedAt: Date.now(),
  };
  upsertCraft(next, sync);
  return { ok: true, craft: next, debrief };
}

/** Apply voyage advances to whole fleet */
export function tickAllVoyages(sync?: SyncContext): {
  updated: Craft[];
  freshPings: { craftId: string; name: string; text: string }[];
  readyIds: string[];
} {
  const fleet = loadFleet();
  const freshPings: { craftId: string; name: string; text: string }[] = [];
  const readyIds: string[] = [];
  const updated: Craft[] = [];

  for (const c of fleet.crafts) {
    if (c.status !== "inflight") continue;
    const { craft, newPings } = advanceVoyageStory(c);
    if (newPings.length || craft.readyToReturn !== c.readyToReturn) {
      upsertCraft(craft, sync);
      updated.push(craft);
    }
    for (const p of newPings) {
      freshPings.push({ craftId: craft.id, name: craft.name, text: p.text });
    }
    if (isReadyToReturn(craft)) readyIds.push(craft.id);
  }

  return { updated, freshPings, readyIds };
}

/** Dev/test: force a probe ready to return soon (or now) */
export function forceReadySoon(craftId: string, sync?: SyncContext): Craft | null {
  const craft = getCraft(craftId);
  if (!craft || craft.status !== "inflight") return null;
  const next = {
    ...craft,
    expectedReturnAt: Date.now() - 1000,
    readyToReturn: true,
  };
  const { craft: story } = advanceVoyageStory({
    ...next,
    launchedAt: (next.launchedAt ?? Date.now()) - voyageDurationMs(next.missionId),
  });
  upsertCraft(story, sync);
  return story;
}

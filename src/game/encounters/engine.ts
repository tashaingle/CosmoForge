import { MISSION_PROFILES } from "../../lib/orbital";
import type { Craft, ProbeMemory, ProbePing } from "../../lib/types";
import { ENCOUNTERS, getEncounter } from "./catalog";
import type {
  EncounterConsequence,
  EncounterDefinition,
  EncounterLocation,
  EncounterRarity,
  EncounterText,
  MemoryRequirement,
} from "./types";

const SAVE_HISTORY_KEY = "cosmoforge_encounter_history_v1";
const rarityWeight: Record<EncounterRarity, number> = {
  common: 1,
  uncommon: 0.42,
  rare: 0.1,
  strange: 0.025,
  cursed: 0.003,
};

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededFraction(value: string): number {
  return (hashSeed(value) % 1_000_000) / 1_000_000;
}

function readSaveHistory(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SAVE_HISTORY_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function writeSaveHistory(history: Record<string, number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVE_HISTORY_KEY, JSON.stringify(history));
}

export function clearSaveEncounterHistory() {
  if (typeof window !== "undefined") localStorage.removeItem(SAVE_HISTORY_KEY);
}

export function encounterLocation(craft: Craft): EncounterLocation {
  if (craft.missionId?.startsWith("event_")) return "solar_event";
  if (craft.missionId === "asteroid_belt") return "asteroid_belt";
  const target = MISSION_PROFILES.find((mission) => mission.id === craft.missionId)?.targetBody?.toLowerCase() ?? "";
  if (target.includes("moon")) return "moon";
  if (target.includes("mars")) return "mars";
  if (target.includes("venus")) return "venus";
  if (target.includes("asteroid")) return "asteroid_belt";
  if (target.includes("earth") || craft.missionId === "leo") return "earth";
  return "deep_space";
}

function memoryMatches(memory: ProbeMemory | undefined, requirements: MemoryRequirement[] | undefined): boolean {
  return (requirements ?? []).every((requirement) => {
    const value = memory?.[requirement.key];
    if (requirement.absent) return value === undefined || value === false;
    if (requirement.equals !== undefined) return value === requirement.equals;
    if (requirement.min !== undefined) return typeof value === "number" && value >= requirement.min;
    return Boolean(value);
  });
}

function renderText(text: EncounterText, craft: Craft): string {
  const personality = craft.personalityId ?? "chipper";
  return (text[personality] ?? text.default).replaceAll("{name}", craft.name);
}

export function encounterText(text: EncounterText, craft: Craft): string {
  return renderText(text, craft);
}

export function openingText(encounter: EncounterDefinition, craft: Craft): string {
  const variant = encounter.memoryVariants?.find((candidate) =>
    (candidate.minRelationship === undefined || (craft.relationship ?? 0) >= candidate.minRelationship)
      && memoryMatches(craft.memory, candidate.memoryRequirements)
  );
  return renderText(variant?.message ?? encounter.message, craft);
}

export function isEncounterEligible(
  encounter: EncounterDefinition,
  craft: Craft,
  saveHistory = readSaveHistory()
): boolean {
  if (encounter.onboardingOnly || craft.onboardingMission) return false;
  if (encounter.validMissions && (!craft.missionId || !encounter.validMissions.includes(craft.missionId))) return false;
  if (encounter.validLocations && !encounter.validLocations.includes(encounterLocation(craft))) return false;
  if ((craft.voyagesCompleted ?? 0) < (encounter.minVoyages ?? 0)) return false;
  if (!memoryMatches(craft.memory, encounter.memoryRequirements)) return false;

  const history = craft.encounterHistory?.[encounter.id];
  const count = history?.count ?? 0;
  if (encounter.repeat === "once_per_probe" && count > 0) return false;
  if (encounter.repeat === "once_per_save" && (saveHistory[encounter.id] ?? 0) > 0) return false;
  if (encounter.maxOccurrences !== undefined && count >= encounter.maxOccurrences) return false;
  if (history && encounter.cooldownVoyages !== undefined) {
    const voyage = craft.voyagesCompleted ?? 0;
    if (voyage - history.lastVoyage < encounter.cooldownVoyages) return false;
  }
  return true;
}

export function selectEncounter(
  craft: Craft,
  slot: number,
  requestedRarity?: EncounterRarity
): EncounterDefinition | undefined {
  const candidates = ENCOUNTERS.filter((encounter) =>
    (!requestedRarity || encounter.rarity === requestedRarity) && isEncounterEligible(encounter, craft)
  );
  const weighted = candidates.map((encounter) => ({
    encounter,
    weight: (encounter.weight ?? 1) * rarityWeight[encounter.rarity],
  }));
  const total = weighted.reduce((sum, candidate) => sum + candidate.weight, 0);
  let cursor = seededFraction(`${craft.id}:${craft.voyagesCompleted ?? 0}:${slot}`) * total;
  for (const candidate of weighted) {
    cursor -= candidate.weight;
    if (cursor <= 0) return candidate.encounter;
  }
  return weighted.at(-1)?.encounter;
}

export function applyEncounterConsequence(craft: Craft, consequence?: EncounterConsequence): Craft {
  if (!consequence) return craft;
  const personality = craft.personalityId ?? "chipper";
  const memory = { ...(craft.memory ?? {}), ...(consequence.memory ?? {}) };
  for (const [key, amount] of Object.entries(consequence.incrementMemory ?? {})) {
    memory[key] = (typeof memory[key] === "number" ? memory[key] : 0) + amount;
  }
  return {
    ...craft,
    relationship: Math.max(-50, Math.min(50, (craft.relationship ?? 0)
      + (consequence.relationship ?? 0)
      + (consequence.relationshipByPersonality?.[personality] ?? 0))),
    memory,
    storyFlags: [...new Set([...(craft.storyFlags ?? []), ...(consequence.storyFlags ?? [])])],
    cargoLootIds: consequence.lootId
      ? [...new Set([...(craft.cargoLootIds ?? []), consequence.lootId])]
      : craft.cargoLootIds,
    scarIds: consequence.scarId
      ? [...new Set([...(craft.scarIds ?? []), consequence.scarId])]
      : craft.scarIds,
  };
}

function recordEncounter(craft: Craft, encounter: EncounterDefinition): Craft {
  const voyage = craft.voyagesCompleted ?? 0;
  const old = craft.encounterHistory?.[encounter.id];
  if (encounter.repeat === "once_per_save") {
    const saveHistory = readSaveHistory();
    writeSaveHistory({ ...saveHistory, [encounter.id]: (saveHistory[encounter.id] ?? 0) + 1 });
  }
  return {
    ...craft,
    encounterHistory: {
      ...(craft.encounterHistory ?? {}),
      [encounter.id]: { count: (old?.count ?? 0) + 1, lastVoyage: voyage },
    },
  };
}

function addRootEncounter(craft: Craft, encounter: EncounterDefinition, atMs: number, slot: number): { craft: Craft; ping: ProbePing } {
  const ping: ProbePing = {
    id: `enc-${craft.voyagesCompleted ?? 0}-${slot}-${encounter.id}`,
    encounterId: encounter.id,
    encounterRarity: encounter.rarity,
    atMs,
    kind: encounter.choices?.length ? "milestone" : "chat",
    text: openingText(encounter, craft),
  };
  const withTrigger = applyEncounterConsequence(craft, encounter.onTrigger);
  const recorded = recordEncounter(withTrigger, encounter);
  return { craft: { ...recorded, pings: [...(recorded.pings ?? []), ping] }, ping };
}

function addFollowUps(craft: Craft, now: number, duration: number): { craft: Craft; added: ProbePing[] } {
  let next = craft;
  const added: ProbePing[] = [];
  const launched = craft.launchedAt ?? now;
  for (const root of craft.pings ?? []) {
    if (!root.encounterId || root.encounterPart) continue;
    const encounter = getEncounter(root.encounterId);
    const followUps = [
      ...(encounter?.followUps ?? []),
      ...(encounter?.choices?.find((choice) => choice.id === root.resolvedChoiceId)?.delayed
        ? [encounter!.choices!.find((choice) => choice.id === root.resolvedChoiceId)!.delayed!]
        : []),
    ];
    for (const followUp of followUps) {
      if (followUp.requiresChoice && root.resolvedChoiceId !== followUp.requiresChoice) continue;
      if (!memoryMatches(next.memory, followUp.memoryRequirements)) continue;
      const id = `${root.id}-${followUp.id}`;
      const atMs = launched + duration * followUp.afterProgress;
      if (now < atMs || next.pings?.some((ping) => ping.id === id)) continue;
      const ping: ProbePing = {
        id,
        encounterId: encounter?.id,
        encounterPart: followUp.id,
        encounterRarity: encounter?.rarity,
        atMs,
        kind: "chat",
        text: encounterText(followUp.message, next),
      };
      next = applyEncounterConsequence({ ...next, pings: [...(next.pings ?? []), ping] }, followUp.consequence);
      added.push(ping);
    }
  }
  return { craft: next, added };
}

function plannedEncounterCount(craft: Craft): number {
  const duration = craft.expectedReturnAt && craft.launchedAt ? craft.expectedReturnAt - craft.launchedAt : 0;
  if (craft.missionId === "leo") return seededFraction(`${craft.id}:${craft.voyagesCompleted ?? 0}:short-count`) < 0.55 ? 1 : 0;
  if (duration >= 25 * 60_000) return seededFraction(`${craft.id}:${craft.voyagesCompleted}:long-count`) < 0.45 ? 2 : 1;
  return 1;
}

export function advanceNormalEncounters(craft: Craft, now: number, duration: number): { craft: Craft; newPings: ProbePing[] } {
  let next = craft;
  const newPings: ProbePing[] = [];
  const count = plannedEncounterCount({ ...craft, expectedReturnAt: (craft.launchedAt ?? now) + duration });
  const progressPoints = count === 2 ? [0.3, 0.7] : [0.48];
  for (let slot = 0; slot < count; slot += 1) {
    const atMs = (craft.launchedAt ?? now) + duration * progressPoints[slot];
    if (now < atMs || next.pings?.some((ping) => ping.id.startsWith(`enc-${craft.voyagesCompleted ?? 0}-${slot}-`))) continue;
    const encounter = selectEncounter(next, slot);
    if (!encounter) continue;
    const result = addRootEncounter(next, encounter, atMs, slot);
    next = result.craft;
    newPings.push(result.ping);
  }
  const followUps = addFollowUps(next, now, duration);
  return { craft: followUps.craft, newPings: [...newPings, ...followUps.added] };
}

export function resolveEncounterChoice(craft: Craft, pingId: string, choiceId: string): Craft {
  const ping = craft.pings?.find((candidate) => candidate.id === pingId);
  const encounter = ping?.encounterId ? getEncounter(ping.encounterId) : undefined;
  const choice = encounter?.choices?.find((candidate) => candidate.id === choiceId);
  if (!ping || !encounter || !choice || ping.resolvedChoiceId) return craft;
  const next = applyEncounterConsequence(craft, choice.consequence);
  return {
    ...next,
    pings: next.pings?.map((candidate) => candidate.id === pingId
      ? { ...candidate, resolvedChoiceId: choiceId, resolutionText: encounterText(choice.response, next) }
      : candidate),
  };
}

export function forceEncounter(craft: Craft, encounterId: string, now = Date.now()): Craft {
  const encounter = getEncounter(encounterId);
  if (!encounter || encounter.onboardingOnly) return craft;
  return addRootEncounter(craft, encounter, now, (craft.pings?.length ?? 0) + 90).craft;
}

export function forceEncounterByRarity(craft: Craft, rarity: EncounterRarity, now = Date.now()): Craft {
  const encounter = selectEncounter(craft, (craft.pings?.length ?? 0) + 99, rarity)
    ?? ENCOUNTERS.find((candidate) => candidate.rarity === rarity);
  return encounter ? forceEncounter(craft, encounter.id, now) : craft;
}

export function clearProbeEncounterHistory(craft: Craft): Craft {
  return { ...craft, encounterHistory: {}, storyFlags: [] };
}

import type { Craft, ProbePing } from "@/lib/types";
import { upsertCraft, type SyncContext } from "@/lib/storage";
import {
  getEncounter,
  resolveEncounterChoice,
  type EncounterChoice,
  type EncounterRarity,
} from "./encounters";

export type InteractiveTransmission = ProbePing & {
  choices?: EncounterChoice[];
  encounterTitle?: string;
  rarity?: EncounterRarity;
};

export function transmissionFor(ping: ProbePing): InteractiveTransmission {
  const encounter = ping.encounterId ? getEncounter(ping.encounterId) : undefined;
  return encounter && !ping.resolvedChoiceId
    ? { ...ping, choices: encounter.choices, encounterTitle: encounter.title, rarity: encounter.rarity }
    : { ...ping, encounterTitle: encounter?.title, rarity: encounter?.rarity };
}

export function resolveTransmissionChoice(
  craft: Craft,
  pingId: string,
  choiceId: string,
  sync?: SyncContext
): Craft | null {
  const ping = craft.pings?.find((item) => item.id === pingId);
  if (!ping?.encounterId) return null;
  const next = resolveEncounterChoice(craft, pingId, choiceId);
  if (next === craft) return null;
  upsertCraft(next, sync);
  return next;
}

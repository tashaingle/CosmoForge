import type { Craft, ProbePing } from "@/lib/types";
import { upsertCraft, type SyncContext } from "@/lib/storage";
import {
  applyEncounterChoice,
  getEncounter,
  type EncounterChoice,
  type EncounterChoiceId,
} from "./encounters";

export type InteractiveTransmission = ProbePing & { choices?: EncounterChoice[] };

export function transmissionFor(ping: ProbePing): InteractiveTransmission {
  const encounter = ping.encounterId ? getEncounter(ping.encounterId) : undefined;
  return encounter && !ping.resolvedChoiceId
    ? { ...ping, choices: encounter.choices }
    : ping;
}

export function resolveTransmissionChoice(
  craft: Craft,
  pingId: string,
  choiceId: EncounterChoiceId,
  sync?: SyncContext
): Craft | null {
  const ping = craft.pings?.find((item) => item.id === pingId);
  if (!ping?.encounterId) return null;
  const next = applyEncounterChoice(craft, pingId, ping.encounterId, choiceId);
  if (next) upsertCraft(next, sync);
  return next;
}

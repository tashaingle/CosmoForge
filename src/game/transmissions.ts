import type { Craft, ProbePing } from "@/lib/types";
import { upsertCraft, type SyncContext } from "@/lib/storage";

export type TransmissionChoice = {
  id: "investigate" | "leave" | "photo";
  label: string;
  consequence: string;
};

export type InteractiveTransmission = ProbePing & { choices?: TransmissionChoice[] };

const CHOICES: TransmissionChoice[] = [
  { id: "investigate", label: "Investigate", consequence: "Risk accepted. The antenna is making brave noises." },
  { id: "leave", label: "Absolutely not", consequence: "Prudence logged. The void seems offended." },
  { id: "photo", label: "Take a photo", consequence: "Image stored. It is mostly blur and emotional significance." },
];

export function transmissionFor(ping: ProbePing): InteractiveTransmission {
  return ping.kind === "milestone" && !ping.resolvedChoiceId
    ? { ...ping, choices: CHOICES }
    : ping;
}

export function resolveTransmissionChoice(
  craft: Craft,
  pingId: string,
  choice: TransmissionChoice,
  sync?: SyncContext
): Craft {
  const pings = (craft.pings ?? []).map((ping) =>
    ping.id === pingId
      ? { ...ping, resolvedChoiceId: choice.id, resolutionText: choice.consequence }
      : ping
  );
  const cargo = new Set(craft.cargoLootIds ?? []);
  const scars = new Set(craft.scarIds ?? []);
  let relationship = craft.relationship ?? 0;
  if (choice.id === "investigate") {
    cargo.add("suspicious_reading");
    relationship += 2;
  } else if (choice.id === "photo") {
    cargo.add("pretty_earthrise");
    relationship -= 1;
  } else {
    scars.add("afraid_of_dark");
    relationship -= 2;
  }
  const next = { ...craft, pings, cargoLootIds: [...cargo], scarIds: [...scars], relationship };
  upsertCraft(next, sync);
  return next;
}

/**
 * Light relationship: how you treat probes changes their voice.
 * - Soft trips (LEO, short) → clingy / overconfident
 * - Hard trips (Mars, belt, Venus, absurd) → cynical / dramatic
 */

import type { Craft } from "./types";
import type { MissionProfileId } from "./orbital";

export type BondLabel =
  | "New hire"
  | "Clingy"
  | "Overconfident"
  | "Professional"
  | "Cynical"
  | "Dramatic veteran"
  | "Done with you";

export function isHardMission(missionId?: MissionProfileId): boolean {
  if (!missionId) return false;
  return [
    "mars_transfer",
    "asteroid_belt",
    "venus_flyby",
    "mercury_scout",
    "jupiter_transfer",
    "saturn_transfer",
  ].includes(missionId);
}

export function bondLabel(relationship = 0): BondLabel {
  if (relationship <= -35) return "Clingy";
  if (relationship <= -15) return "Overconfident";
  if (relationship < 15) return "Professional";
  if (relationship < 30) return "Cynical";
  if (relationship < 45) return "Dramatic veteran";
  return "Done with you";
}

export function bondBlurb(relationship = 0): string {
  switch (bondLabel(relationship)) {
    case "Clingy":
      return "Texts more than protocol allows. Please don’t leave them in deep space.";
    case "Overconfident":
      return "You’ve babied them. They think vacuum is a lifestyle brand.";
    case "Professional":
      return "Mostly normal. For a talking box.";
    case "Cynical":
      return "They’ve done the hard trips. The pings got shorter.";
    case "Dramatic veteran":
      return "Every burn is a monologue. You’ve earned this.";
    case "Done with you":
      return "Still flies. Emotionally resigned. Respect.";
    default:
      return "Just getting to know mission control.";
  }
}

/** Apply after a completed or failed voyage */
export function applyTripToRelationship(
  craft: Craft,
  opts: { hard: boolean; absurd?: boolean; lost?: boolean }
): Craft {
  let r = craft.relationship ?? 0;
  let hardTrips = craft.hardTrips ?? 0;
  let softTrips = craft.softTrips ?? 0;
  let voyages = craft.voyagesCompleted ?? 0;

  if (opts.lost) {
    // no voyage complete credit
  } else {
    voyages += 1;
  }

  if (opts.absurd || opts.hard) {
    hardTrips += 1;
    r = Math.min(50, r + (opts.absurd ? 12 : 8));
  } else {
    softTrips += 1;
    r = Math.max(-50, r - 6);
  }

  return {
    ...craft,
    relationship: r,
    hardTrips,
    softTrips,
    voyagesCompleted: voyages,
  };
}

export function relationshipPingFlavor(relationship = 0): string | null {
  const label = bondLabel(relationship);
  if (label === "Clingy") return "Also: please reply when you can.";
  if (label === "Overconfident") return "I could do this blindfolded. (I cannot.)";
  if (label === "Cynical") return "Anyway.";
  if (label === "Dramatic veteran") return "As foretold.";
  if (label === "Done with you") return "…";
  return null;
}

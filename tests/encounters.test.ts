import test from "node:test";
import assert from "node:assert/strict";
import { NORMAL_ENCOUNTERS, ONBOARDING_ENCOUNTER, getEncounter } from "../src/game/encounters/catalog";
import {
  advanceNormalEncounters,
  encounterLocation,
  isEncounterEligible,
  openingText,
  resolveEncounterChoice,
  selectEncounter,
} from "../src/game/encounters/engine";
import type { Craft } from "../src/lib/types";

function probe(overrides: Partial<Craft> = {}): Craft {
  return {
    id: "test-probe",
    name: "Mildred",
    partIds: [],
    createdAt: 1,
    updatedAt: 1,
    status: "inflight",
    missionId: "mars_transfer",
    personalityId: "anxious",
    relationship: 4,
    voyagesCompleted: 5,
    launchedAt: 1_000,
    expectedReturnAt: 1_801_000,
    pings: [],
    ...overrides,
  };
}

test("normal library contains 25 unique encounters and excludes onboarding", () => {
  assert.equal(NORMAL_ENCOUNTERS.length, 25);
  assert.equal(new Set(NORMAL_ENCOUNTERS.map((encounter) => encounter.id)).size, 25);
  assert.equal(NORMAL_ENCOUNTERS.includes(ONBOARDING_ENCOUNTER), false);
  const typeCounts = Object.groupBy(NORMAL_ENCOUNTERS, (encounter) => encounter.type);
  assert.equal(typeCounts.flavour?.length, 8);
  assert.equal(typeCounts.simple_choice?.length, 7);
  assert.equal(typeCounts.risk_choice?.length, 4);
  assert.equal(typeCounts.delayed?.length, 3);
  assert.equal(typeCounts.multi_part?.length, 3);
});

test("mission IDs map to encounter locations", () => {
  assert.equal(encounterLocation(probe({ missionId: "lunar" })), "moon");
  assert.equal(encounterLocation(probe({ missionId: "asteroid_belt" })), "asteroid_belt");
  assert.equal(encounterLocation(probe({ missionId: "event_storm_rider" })), "solar_event");
});

test("selection is deterministic after a reload and respects location", () => {
  const craft = probe();
  const first = selectEncounter(craft, 0);
  const second = selectEncounter({ ...craft }, 0);
  assert.equal(first?.id, second?.id);
  if (first?.validLocations) assert.ok(first.validLocations.includes("mars"));
});

test("once-per-probe and voyage cooldown rules prevent repeats", () => {
  const once = getEncounter("extra_star")!;
  assert.equal(isEncounterEligible(once, probe({ encounterHistory: { extra_star: { count: 1, lastVoyage: 2 } } })), false);
  const recurring = getEncounter("near_signal")!;
  assert.equal(isEncounterEligible(recurring, probe({ voyagesCompleted: 6, encounterHistory: { near_signal: { count: 1, lastVoyage: 5 } } })), false);
  assert.equal(isEncounterEligible(recurring, probe({ voyagesCompleted: 8, encounterHistory: { near_signal: { count: 1, lastVoyage: 5 } } })), true);
});

test("memory callbacks retain the probe's voice and interpolate its name", () => {
  const signal = getEncounter("near_signal")!;
  assert.match(openingText(signal, probe({ memory: { first_encounter_choice: "investigate" } })), /another 'investigate it'/);
  const repeating = getEncounter("repeating_signal")!;
  assert.match(openingText(repeating, probe({ memory: { repeating_signal_encounters: 3 } })), /Mildred/);
});

test("a choice changes relationship, cargo, scars, memory, and resolves exactly once", () => {
  const craft = probe({ pings: [{ id: "choice", atMs: 2, kind: "milestone", text: "Signal", encounterId: "near_signal" }] });
  const result = resolveEncounterChoice(craft, "choice", "approach");
  assert.equal(result.relationship, 6);
  assert.ok(result.cargoLootIds?.includes("radio_whisper"));
  assert.ok(result.scarIds?.includes("scorched"));
  assert.equal(result.memory?.bad_ideas_survived, 1);
  assert.equal(result.pings?.[0].resolvedChoiceId, "approach");
  assert.equal(resolveEncounterChoice(result, "choice", "leave"), result);
});

test("multi-part follow-ups appear once when their progress thresholds pass", () => {
  const extra = getEncounter("extra_star")!;
  const root: Craft = probe({
    pings: [{ id: "enc-5-0-extra_star", atMs: 541_000, kind: "chat", text: extra.message.default, encounterId: extra.id }],
    encounterHistory: { extra_star: { count: 1, lastVoyage: 5 } },
    memory: { extra_star_stage: 1 },
  });
  const first = advanceNormalEncounters(root, 1_750_000, 1_800_000).craft;
  assert.ok(first.pings?.some((ping) => ping.encounterPart === "moved"));
  assert.ok(first.pings?.some((ping) => ping.encounterPart === "behind"));
  const second = advanceNormalEncounters(first, 1_750_000, 1_800_000).craft;
  assert.equal(second.pings?.filter((ping) => ping.encounterPart === "moved").length, 1);
});

test("a delayed consequence waits for its chosen branch", () => {
  const root = probe({
    pings: [{ id: "enc-5-0-static_hitchhiker", atMs: 541_000, kind: "milestone", text: "Static", encounterId: "static_hitchhiker" }],
    encounterHistory: { static_hitchhiker: { count: 1, lastVoyage: 5 } },
  });
  const unresolved = advanceNormalEncounters(root, 1_750_000, 1_800_000).craft;
  assert.equal(unresolved.pings?.some((ping) => ping.encounterPart === "voice"), false);
  const chosen = resolveEncounterChoice(root, "enc-5-0-static_hitchhiker", "listen");
  const resolved = advanceNormalEncounters(chosen, 1_750_000, 1_800_000).craft;
  assert.ok(resolved.pings?.some((ping) => ping.encounterPart === "voice"));
  assert.ok(resolved.cargoLootIds?.includes("radio_whisper"));
});

test("onboarding mission is excluded from normal encounter selection", () => {
  assert.equal(selectEncounter(probe({ onboardingMission: true }), 0), undefined);
});

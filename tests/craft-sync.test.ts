import test from "node:test";
import assert from "node:assert/strict";
import { applyStory, mergeCraft, storyFromCraft } from "../src/lib/craft-mapper";
import type { Craft } from "../src/lib/types";

function craft(overrides: Partial<Craft> = {}): Craft {
  return {
    id: "probe-1",
    name: "Mildred",
    partIds: ["hull"],
    createdAt: 1,
    updatedAt: 10,
    status: "inflight",
    ...overrides,
  };
}

test("story round-trips personality, pings, scars, cargo and debrief", () => {
  const local = craft({
    personalityId: "dramatic",
    scarIds: ["scorched"],
    cargoLootIds: ["lucky_bolt"],
    pings: [{ id: "p1", atMs: 2, kind: "chat", text: "hello", encounterId: "radio_whisper" }],
    relationship: 4,
    lastDebrief: {
      craftId: "probe-1",
      craftName: "Mildred",
      missionName: "Mars Hohmann",
      opener: "I lived.",
      summary: "Mostly.",
      highlights: ["Brought back: Lucky bolt"],
      lootIds: ["lucky_bolt"],
      scarIds: ["scorched"],
      personalityId: "dramatic",
    },
    memory: { radio_whispers: 1 },
    onboardingMission: true,
  });
  const restored = applyStory(craft({ updatedAt: 99 }), storyFromCraft(local));
  assert.equal(restored.personalityId, "dramatic");
  assert.deepEqual(restored.scarIds, ["scorched"]);
  assert.deepEqual(restored.cargoLootIds, ["lucky_bolt"]);
  assert.equal(restored.pings?.[0].encounterId, "radio_whisper");
  assert.equal(restored.lastDebrief?.opener, "I lived.");
  assert.equal(restored.relationship, 4);
  assert.equal(restored.memory?.radio_whispers, 1);
  assert.equal(restored.onboardingMission, true);
});

test("applyStory ignores missing or foreign versions", () => {
  const base = craft({ personalityId: "anxious" });
  assert.equal(applyStory(base, null).personalityId, "anxious");
  assert.equal(applyStory(base, { version: 2 as 1, personalityId: "chaotic" }).personalityId, "anxious");
});

test("newer cloud story replaces local pings", () => {
  const local = craft({ updatedAt: 10, pings: [{ id: "old", atMs: 1, kind: "chat", text: "old" }] });
  const cloud = craft({ updatedAt: 20, pings: [{ id: "new", atMs: 2, kind: "chat", text: "new" }] });
  assert.equal(mergeCraft(local, cloud).pings?.[0].id, "new");
});

test("newer cloud hull without story keeps local pings and scars", () => {
  const local = craft({
    updatedAt: 10,
    personalityId: "poet",
    scarIds: ["limps"],
    pings: [{ id: "keep", atMs: 1, kind: "chat", text: "keep me" }],
    cargoLootIds: ["moon_rock"],
  });
  const cloud = craft({ updatedAt: 20, name: "Cloud Mildred" });
  const merged = mergeCraft(local, cloud);
  assert.equal(merged.name, "Cloud Mildred");
  assert.equal(merged.personalityId, "poet");
  assert.deepEqual(merged.scarIds, ["limps"]);
  assert.equal(merged.pings?.[0].id, "keep");
  assert.deepEqual(merged.cargoLootIds, ["moon_rock"]);
});

test("older local hull does not overwrite a complete newer cloud story", () => {
  const local = craft({ updatedAt: 5, personalityId: "chipper" });
  const cloud = craft({ updatedAt: 40, personalityId: "grumpy", scarIds: ["quiet_now"] });
  const merged = mergeCraft(local, cloud);
  assert.equal(merged.personalityId, "grumpy");
  assert.deepEqual(merged.scarIds, ["quiet_now"]);
});

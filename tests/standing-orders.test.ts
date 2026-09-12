import test from "node:test";
import assert from "node:assert/strict";
import { standingOrder } from "../src/lib/standing-orders";

test("launch is the duty when no probe is selected", () => {
  const order = standingOrder({});
  assert.equal(order.tone, "launch");
  assert.match(order.blurb, /Mission Control/);
});

test("a live question beats waiting and returning", () => {
  const order = standingOrder({ craftName: "Mildred", status: "inflight", pendingChoice: true, readyToReturn: true });
  assert.equal(order.tone, "choice");
  assert.equal(order.title, "Answer Mildred");
});

test("return window is next when the probe is ready and not asking", () => {
  const order = standingOrder({ craftName: "Moss", status: "inflight", readyToReturn: true });
  assert.equal(order.tone, "return");
  assert.equal(order.title, "Bring Moss home");
});

test("inflight without a question tells the player to stay on console", () => {
  const order = standingOrder({ craftName: "Chip", status: "inflight" });
  assert.equal(order.tone, "wait");
  assert.match(order.blurb, /Stay on this screen/);
});

test("a home probe points at Archive or another launch", () => {
  const order = standingOrder({ craftName: "Leo", status: "complete" });
  assert.equal(order.tone, "home");
  assert.match(order.blurb, /Archive/);
});

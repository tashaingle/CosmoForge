import { nanoid } from "nanoid";
import { defaultStarterParts } from "./ship";
import type { Craft, FleetState, SharePayload } from "./types";
import type { MissionProfileId } from "./orbital";
import { createOrbitForMission } from "./orbital";
import { computeStats } from "./ship";

const STORAGE_KEY = "cosmoforge-fleet-v1";

function emptyFleet(): FleetState {
  return { version: 1, crafts: [], selectedCraftId: null };
}

export function loadFleet(): FleetState {
  if (typeof window === "undefined") return emptyFleet();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyFleet();
    const parsed = JSON.parse(raw) as FleetState;
    if (!parsed?.crafts || !Array.isArray(parsed.crafts)) return emptyFleet();
    return parsed;
  } catch {
    return emptyFleet();
  }
}

export function saveFleet(state: FleetState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createCraft(name = "New Probe"): Craft {
  const now = Date.now();
  return {
    id: nanoid(10),
    name,
    partIds: defaultStarterParts(),
    createdAt: now,
    updatedAt: now,
    status: "design",
  };
}

export function upsertCraft(craft: Craft): FleetState {
  const fleet = loadFleet();
  const idx = fleet.crafts.findIndex((c) => c.id === craft.id);
  const next = { ...craft, updatedAt: Date.now() };
  if (idx >= 0) fleet.crafts[idx] = next;
  else fleet.crafts.unshift(next);
  fleet.selectedCraftId = next.id;
  saveFleet(fleet);
  return fleet;
}

export function getCraft(id: string): Craft | undefined {
  return loadFleet().crafts.find((c) => c.id === id);
}

export function deleteCraft(id: string): FleetState {
  const fleet = loadFleet();
  fleet.crafts = fleet.crafts.filter((c) => c.id !== id);
  if (fleet.selectedCraftId === id) {
    fleet.selectedCraftId = fleet.crafts[0]?.id ?? null;
  }
  saveFleet(fleet);
  return fleet;
}

export function launchCraft(
  craftId: string,
  missionId: MissionProfileId
): Craft | null {
  const craft = getCraft(craftId);
  if (!craft) return null;
  const stats = computeStats(craft.partIds);
  if (!stats.launchReady) return null;

  const launchedAt = Date.now();
  const orbit = createOrbitForMission(missionId, launchedAt, stats.deltaVms);
  const next: Craft = {
    ...craft,
    status: "inflight",
    missionId,
    orbit,
    launchedAt,
    lastSimMs: launchedAt,
    updatedAt: launchedAt,
  };
  upsertCraft(next);
  return next;
}

/** Advance craft sim clock for offline persistence display */
export function touchCraftSim(craftId: string, simMs: number): void {
  const craft = getCraft(craftId);
  if (!craft || craft.status !== "inflight") return;
  upsertCraft({ ...craft, lastSimMs: simMs });
}

export function encodeShare(craft: Craft): string {
  const payload: SharePayload = { v: 1, craft, exportedAt: Date.now() };
  const json = JSON.stringify(payload);
  // URL-safe base64
  const b64 =
    typeof window !== "undefined"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(token: string): SharePayload | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json =
      typeof window !== "undefined"
        ? decodeURIComponent(escape(atob(b64 + pad)))
        : Buffer.from(b64 + pad, "base64").toString("utf8");
    const payload = JSON.parse(json) as SharePayload;
    if (payload?.v !== 1 || !payload.craft?.orbit) return null;
    return payload;
  } catch {
    return null;
  }
}

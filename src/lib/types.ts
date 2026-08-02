import type { OrbitElements, MissionProfileId } from "./orbital";
import type { PersonalityId, ScarId } from "./probe-personality";
import type { LootId } from "./probe-loot";

/** Short message from a probe while away */
export interface ProbePing {
  id: string;
  atMs: number;
  text: string;
  kind: "chat" | "milestone" | "return";
}

/** Shown when a probe comes home — the real game moment */
export interface VoyageDebrief {
  craftId: string;
  craftName: string;
  missionName: string;
  opener: string;
  summary: string;
  highlights: string[];
  lootIds: LootId[];
  scarIds: ScarId[];
  personalityId: PersonalityId;
}

export interface Craft {
  id: string;
  name: string;
  partIds: string[];
  createdAt: number;
  updatedAt: number;
  /** Set once launched */
  status: "design" | "inflight" | "complete";
  missionId?: MissionProfileId;
  orbit?: OrbitElements;
  launchedAt?: number;
  /** Wall-clock when sim clock was last advanced / saved */
  lastSimMs?: number;
  notes?: string;
  /** Cloud owner (when synced) */
  userId?: string;
  /** Display name for multiplayer map */
  commanderName?: string;
  /** Cosmetic skin id */
  skinId?: string;

  // —— Little Ships With Big Personalities ——
  personalityId?: PersonalityId;
  /** One-line vibe shown in hangar */
  personalityVibe?: string;
  /** Permanent changes from voyages */
  scarIds?: ScarId[];
  /** Messages while away */
  pings?: ProbePing[];
  /** Loot in hold (catalogued on debrief) */
  cargoLootIds?: LootId[];
  /** Wall-clock when voyage is “done enough” to call home */
  expectedReturnAt?: number;
  readyToReturn?: boolean;
  /** Last completed debrief (for re-read) */
  lastDebrief?: VoyageDebrief;
  /** Preset flavor id if launched from one-tap */
  presetId?: string;
}

export interface FleetState {
  version: 1;
  crafts: Craft[];
  selectedCraftId: string | null;
}

export interface SharePayload {
  v: 1;
  craft: Craft;
  exportedAt: number;
}

/** Other players' craft on the shared map */
export interface LiveCraftMarker {
  id: string;
  name: string;
  commanderName: string;
  missionId?: MissionProfileId;
  orbit: OrbitElements;
  launchedAt?: number;
  lastSimMs?: number;
  isSelf?: boolean;
  skinId?: string;
}

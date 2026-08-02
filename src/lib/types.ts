import type { OrbitElements, MissionProfileId } from "./orbital";

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

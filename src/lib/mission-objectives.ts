import {
  craftScenePosition,
  heliocentricDistanceAU,
  periodDays,
  planetPositionAU,
  positionPerifocal,
  toInertial,
  type MissionProfileId,
  type OrbitElements,
} from "./orbital";

export interface MissionObjective {
  id: string;
  title: string;
  /** Why this matters — one line */
  why: string;
  rewardCredits: number;
  /** 0–1 progress */
  progress: (ctx: ObjectiveContext) => number;
  /** True when complete */
  complete: (ctx: ObjectiveContext) => boolean;
}

export interface ObjectiveContext {
  missionId: MissionProfileId;
  orbit: OrbitElements;
  simMs: number;
  launchMs: number;
  /** Science scans performed this mission */
  scanCount: number;
}

export interface MissionBriefing {
  missionId: MissionProfileId;
  /** One-sentence purpose */
  purpose: string;
  /** What “winning” this flight looks like */
  winCondition: string;
  /** How to play this screen */
  howTo: string;
  objectives: MissionObjective[];
}

function missionDays(ctx: ObjectiveContext): number {
  return (ctx.simMs - ctx.launchMs) / (86400 * 1000);
}

function orbitsCompleted(ctx: ObjectiveContext): number {
  const p = periodDays(ctx.orbit);
  if (p <= 0) return 0;
  return missionDays(ctx) / p;
}

function geoAltitudeKm(ctx: ObjectiveContext): number {
  if (ctx.orbit.centralBody !== "earth") return 0;
  const pos = toInertial(positionPerifocal(ctx.orbit, ctx.simMs), ctx.orbit);
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
  return r - 6371;
}

function distToPlanetAU(
  ctx: ObjectiveContext,
  planet: "mars" | "earth" | "jupiter" | "venus" | "mercury" | "saturn"
): number {
  const c = craftScenePosition(ctx.orbit, ctx.simMs);
  const p = planetPositionAU(planet, ctx.simMs);
  const dx = c.x - p.x;
  const dy = c.y - p.y;
  const dz = c.z - p.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function obj(
  id: string,
  title: string,
  why: string,
  rewardCredits: number,
  progress: (ctx: ObjectiveContext) => number
): MissionObjective {
  return {
    id,
    title,
    why,
    rewardCredits,
    progress: (ctx) => clamp01(progress(ctx)),
    complete: (ctx) => progress(ctx) >= 1,
  };
}

const BRIEFS: Record<string, Omit<MissionBriefing, "objectives"> & { objectives: MissionObjective[] }> = {
  leo: {
    missionId: "leo",
    purpose: "Prove the ship works: park in LEO and collect early science.",
    winCondition: "Complete checkout orbits and run science scans.",
    howTo: "Use time warp to advance orbits. Complete goals below for credits.",
    objectives: [
      obj(
        "leo_orbit_1",
        "Complete 1 orbit",
        "Basic systems checkout — every real mission starts here.",
        40,
        (ctx) => orbitsCompleted(ctx) / 1
      ),
      obj(
        "leo_orbit_10",
        "Complete 10 orbits",
        "Thermal & power cycles need multiple day/night passes.",
        80,
        (ctx) => orbitsCompleted(ctx) / 10
      ),
      obj(
        "leo_scan_3",
        "Run 3 science scans",
        "You’re not just sightseeing — gather data while you wait.",
        60,
        (ctx) => ctx.scanCount / 3
      ),
    ],
  },
  lunar: {
    missionId: "lunar",
    purpose: "Reach the Moon’s neighborhood on a high ellipse.",
    winCondition: "Climb toward lunar distance and log transfer science.",
    howTo: "Warp until altitude grows. Scan when the UI allows.",
    objectives: [
      obj(
        "lunar_high",
        "Reach 50,000 km altitude",
        "Leave low Earth for cislunar space.",
        70,
        (ctx) => geoAltitudeKm(ctx) / 50_000
      ),
      obj(
        "lunar_near",
        "Approach lunar distance",
        "Climb past 300,000 km toward the Moon.",
        120,
        (ctx) => geoAltitudeKm(ctx) / 300_000
      ),
      obj(
        "lunar_scan",
        "Run 2 science scans",
        "Photograph Earthrise-class data for the log.",
        50,
        (ctx) => ctx.scanCount / 2
      ),
    ],
  },
  mars_transfer: {
    missionId: "mars_transfer",
    purpose: "Send a probe onto a Hohmann-like path toward Mars.",
    winCondition: "Leave Earth’s vicinity and close the gap to Mars.",
    howTo: "Warp days/months. Watch heliocentric distance and Mars range.",
    objectives: [
      obj(
        "mars_escape",
        "Leave near-Earth space",
        "Get beyond ~1.05 AU from the Sun on the transfer.",
        90,
        (ctx) => {
          const r = heliocentricDistanceAU(ctx.orbit, ctx.simMs);
          return (r - 1.0) / 0.05;
        }
      ),
      obj(
        "mars_mid",
        "Cross the halfway zone",
        "Pass ~1.25 AU — deep into interplanetary cruise.",
        120,
        (ctx) => {
          const r = heliocentricDistanceAU(ctx.orbit, ctx.simMs);
          return (r - 1.0) / 0.25;
        }
      ),
      obj(
        "mars_approach",
        "Approach Mars",
        "Get within 0.2 AU of Mars — arrival corridor.",
        200,
        (ctx) => {
          const d = distToPlanetAU(ctx, "mars");
          // closer = better; 0.2 AU target
          return (1.0 - d) / (1.0 - 0.2);
        }
      ),
    ],
  },
  asteroid_belt: {
    missionId: "asteroid_belt",
    purpose: "Scout the inner belt — where the metals (and future mining) are.",
    winCondition: "Push past 2 AU into belt territory.",
    howTo: "Long cruise. Warp aggressively. Scan the void.",
    objectives: [
      obj(
        "belt_15",
        "Reach 1.5 AU",
        "Past the main shipping lanes of the inner system.",
        80,
        (ctx) => (heliocentricDistanceAU(ctx.orbit, ctx.simMs) - 1.0) / 0.5
      ),
      obj(
        "belt_20",
        "Reach 2.0 AU",
        "Outer edge of the inner planets’ comfort zone.",
        140,
        (ctx) => (heliocentricDistanceAU(ctx.orbit, ctx.simMs) - 1.0) / 1.0
      ),
      obj(
        "belt_scan",
        "Run 4 science scans",
        "Survey for virtual resources / POI seeds.",
        70,
        (ctx) => ctx.scanCount / 4
      ),
    ],
  },
  event_meteor_watch: {
    missionId: "event_meteor_watch",
    purpose: "Ride a high-inclination orbit during a meteor shower window.",
    winCondition: "Log orbits + scans while the sky event is hot.",
    howTo: "Warp through several orbits; scan often for bonus data.",
    objectives: [
      obj(
        "met_orbits",
        "Complete 5 orbits",
        "Sample multiple radiant passes.",
        70,
        (ctx) => orbitsCompleted(ctx) / 5
      ),
      obj(
        "met_scan",
        "Run 5 science scans",
        "Meteor-season science pays.",
        90,
        (ctx) => ctx.scanCount / 5
      ),
    ],
  },
  event_mars_rush: {
    missionId: "event_mars_rush",
    purpose: "Opposition rush — push hard toward Mars while the geometry is good.",
    winCondition: "Close in on Mars faster than a standard transfer goal.",
    howTo: "Time warp to the Mars approach objective.",
    objectives: [
      obj(
        "rush_mid",
        "Reach 1.2 AU",
        "Get onto the express track.",
        100,
        (ctx) => (heliocentricDistanceAU(ctx.orbit, ctx.simMs) - 1.0) / 0.2
      ),
      obj(
        "rush_mars",
        "Approach Mars (0.25 AU)",
        "Opposition window payoff.",
        180,
        (ctx) => {
          const d = distToPlanetAU(ctx, "mars");
          return (1.2 - d) / (1.2 - 0.25);
        }
      ),
    ],
  },
  event_storm_rider: {
    missionId: "event_storm_rider",
    purpose: "Patrol in polar-ish orbit during elevated solar weather.",
    winCondition: "Survive multiple orbits and log storm science.",
    howTo: "Warp orbits; scan during the storm window.",
    objectives: [
      obj(
        "storm_orbits",
        "Complete 8 orbits",
        "Storm-hardened systems need cycle time.",
        80,
        (ctx) => orbitsCompleted(ctx) / 8
      ),
      obj(
        "storm_scan",
        "Run 4 storm scans",
        "Particle & radiation dataset.",
        100,
        (ctx) => ctx.scanCount / 4
      ),
    ],
  },
  event_eclipse_chase: {
    missionId: "event_eclipse_chase",
    purpose: "Orbit to maximize eclipse-corridor science passes.",
    winCondition: "Complete observation orbits and scans.",
    howTo: "Warp and scan — treat this like a special observation campaign.",
    objectives: [
      obj(
        "ecl_orbits",
        "Complete 6 orbits",
        "Multiple ground-track opportunities.",
        75,
        (ctx) => orbitsCompleted(ctx) / 6
      ),
      obj(
        "ecl_scan",
        "Run 3 scans",
        "Corona / limb science package.",
        85,
        (ctx) => ctx.scanCount / 3
      ),
    ],
  },
  venus_flyby: {
    missionId: "venus_flyby",
    purpose: "Fall sunward and approach Venus.",
    winCondition: "Get within 0.25 AU of Venus.",
    howTo: "Warp the transfer; stamp Venus in your passport.",
    objectives: [
      obj(
        "ven_in",
        "Drop below 0.9 AU",
        "Leave Earth’s solar distance.",
        90,
        (ctx) => (1.0 - heliocentricDistanceAU(ctx.orbit, ctx.simMs)) / 0.1
      ),
      obj(
        "ven_near",
        "Approach Venus",
        "Within 0.25 AU of the planet.",
        160,
        (ctx) => {
          const d = distToPlanetAU(ctx, "venus");
          return (0.8 - d) / (0.8 - 0.25);
        }
      ),
      obj(
        "ven_scan",
        "Run 2 scans",
        "Atmosphere approach science.",
        50,
        (ctx) => ctx.scanCount / 2
      ),
    ],
  },
  mercury_scout: {
    missionId: "mercury_scout",
    purpose: "Push deep sunward toward Mercury.",
    winCondition: "Reach Mercury’s neighborhood.",
    howTo: "Long sunward warp — heat is fictional, glory is real.",
    objectives: [
      obj(
        "mer_05",
        "Reach 0.6 AU",
        "Inner-system heat shield territory.",
        100,
        (ctx) => (1.0 - heliocentricDistanceAU(ctx.orbit, ctx.simMs)) / 0.4
      ),
      obj(
        "mer_near",
        "Approach Mercury",
        "Within 0.2 AU of Mercury.",
        180,
        (ctx) => {
          const d = distToPlanetAU(ctx, "mercury");
          return (0.7 - d) / (0.7 - 0.2);
        }
      ),
    ],
  },
  jupiter_transfer: {
    missionId: "jupiter_transfer",
    purpose: "Cruise to the Jovian system.",
    winCondition: "Get close enough to stamp Jupiter.",
    howTo: "Use high time warp — this is a long haul.",
    objectives: [
      obj(
        "jup_3",
        "Reach 3 AU",
        "Past the main belt.",
        100,
        (ctx) => (heliocentricDistanceAU(ctx.orbit, ctx.simMs) - 1) / 2
      ),
      obj(
        "jup_near",
        "Approach Jupiter",
        "Within 0.8 AU of Jupiter.",
        220,
        (ctx) => {
          const d = distToPlanetAU(ctx, "jupiter");
          return (4 - d) / (4 - 0.8);
        }
      ),
    ],
  },
  europa_scout: {
    missionId: "europa_scout",
    purpose: "Aim for Jupiter’s ice moon — ocean-world science.",
    winCondition: "Enter Jovian space and log ice-moon scans.",
    howTo: "Warp to Jupiter; scan for Europa science.",
    objectives: [
      obj(
        "eu_jup",
        "Approach Jupiter system",
        "Within 1 AU of Jupiter.",
        180,
        (ctx) => {
          const d = distToPlanetAU(ctx, "jupiter");
          return (4 - d) / (4 - 1);
        }
      ),
      obj(
        "eu_scan",
        "Run 3 ice-moon scans",
        "Prep data for ocean-world follow-ups.",
        100,
        (ctx) => ctx.scanCount / 3
      ),
    ],
  },
  saturn_transfer: {
    missionId: "saturn_transfer",
    purpose: "Reach the ringed giant.",
    winCondition: "Stamp Saturn on your passport.",
    howTo: "Maximum warp. Bring patience (or 1M×).",
    objectives: [
      obj(
        "sat_5",
        "Reach 5 AU",
        "Jupiter’s neighborhood en route.",
        110,
        (ctx) => (heliocentricDistanceAU(ctx.orbit, ctx.simMs) - 1) / 4
      ),
      obj(
        "sat_near",
        "Approach Saturn",
        "Within 1.2 AU of Saturn.",
        250,
        (ctx) => {
          const d = distToPlanetAU(ctx, "saturn");
          return (8 - d) / (8 - 1.2);
        }
      ),
    ],
  },
  titan_scout: {
    missionId: "titan_scout",
    purpose: "Saturn system recon for Titan — lakes of methane.",
    winCondition: "Enter Saturn space and scan.",
    howTo: "Warp deep outer system; stamp Titan when close enough.",
    objectives: [
      obj(
        "ti_sat",
        "Approach Saturn system",
        "Within 1.5 AU of Saturn.",
        200,
        (ctx) => {
          const d = distToPlanetAU(ctx, "saturn");
          return (8 - d) / (8 - 1.5);
        }
      ),
      obj(
        "ti_scan",
        "Run 3 Titan scans",
        "Organic haze dataset.",
        110,
        (ctx) => ctx.scanCount / 3
      ),
    ],
  },
};

// distToPlanetAU already supports mars/earth/jupiter — extend for more

export function getMissionBriefing(
  missionId: MissionProfileId | undefined
): MissionBriefing {
  if (missionId && BRIEFS[missionId]) {
    return BRIEFS[missionId] as MissionBriefing;
  }
  return {
    missionId: "leo",
    purpose: "Fly the craft and complete objectives for credits.",
    winCondition: "Finish the listed goals.",
    howTo: "Use time warp and science scans.",
    objectives: BRIEFS.leo.objectives,
  };
}

/** Short copy for hangar / launch cards */
export function missionPurposeLine(missionId: MissionProfileId): string {
  return getMissionBriefing(missionId).purpose;
}

// --- Progress persistence ---

const PROG_KEY = "cosmoforge-objectives-v1";

export interface CraftObjectiveState {
  completedIds: string[];
  claimedIds: string[];
  scanCount: number;
  lastScanSimMs: number;
}

function defaultState(): CraftObjectiveState {
  return {
    completedIds: [],
    claimedIds: [],
    scanCount: 0,
    lastScanSimMs: 0,
  };
}

export function loadObjectiveState(craftId: string): CraftObjectiveState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(PROG_KEY);
    if (!raw) return defaultState();
    const all = JSON.parse(raw) as Record<string, CraftObjectiveState>;
    return all[craftId] ?? defaultState();
  } catch {
    return defaultState();
  }
}

export function saveObjectiveState(
  craftId: string,
  state: CraftObjectiveState
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PROG_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, CraftObjectiveState>) : {};
    all[craftId] = state;
    localStorage.setItem(PROG_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/** Min sim-time between scans (6 hours of mission time) */
export const SCAN_COOLDOWN_MS = 6 * 3600 * 1000;

export function canScan(state: CraftObjectiveState, simMs: number): boolean {
  return simMs - state.lastScanSimMs >= SCAN_COOLDOWN_MS || state.scanCount === 0;
}

export function performScan(
  craftId: string,
  simMs: number
): { state: CraftObjectiveState; ok: boolean; message: string } {
  const state = loadObjectiveState(craftId);
  if (!canScan(state, simMs) && state.scanCount > 0) {
    const left = SCAN_COOLDOWN_MS - (simMs - state.lastScanSimMs);
    const hours = (left / 3600000).toFixed(1);
    return {
      state,
      ok: false,
      message: `Instruments cooling down — ~${hours}h mission time left`,
    };
  }
  state.scanCount += 1;
  state.lastScanSimMs = simMs;
  saveObjectiveState(craftId, state);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { trackDailyScan } = require("./daily") as {
      trackDailyScan: () => void;
    };
    trackDailyScan();
  } catch {
    /* ignore */
  }
  return {
    state,
    ok: true,
    message: `Science scan #${state.scanCount} logged`,
  };
}

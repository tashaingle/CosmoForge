import {
  AU_KM,
  EPOCH_MS,
  MU_EARTH_KM3_S2,
  MU_SUN_KM3_S2,
  SECONDS_PER_DAY,
} from "./constants";
import {
  bodyPositionAU,
  type BodyId,
  type Vec3,
} from "./bodies";

export type { Vec3 } from "./bodies";
export type { BodyId, PlanetId } from "./bodies";

/** Keplerian elements for craft around the Sun (heliocentric) or Earth (geocentric LEO) */
export interface OrbitElements {
  /** Semi-major axis in km */
  a: number;
  /** Eccentricity 0–1 */
  e: number;
  /** Inclination rad (kept ~0 in alpha) */
  i: number;
  /** Longitude of ascending node rad */
  raan: number;
  /** Argument of periapsis rad */
  argPeri: number;
  /** Mean anomaly at epoch rad */
  meanAnomaly0: number;
  /** Epoch as unix ms */
  epochMs: number;
  /** "sun" | "earth" central body */
  centralBody: "sun" | "earth";
}

export type MissionProfileId =
  | "leo"
  | "lunar"
  | "mars_transfer"
  | "asteroid_belt"
  | "venus_flyby"
  | "mercury_scout"
  | "jupiter_transfer"
  | "europa_scout"
  | "saturn_transfer"
  | "titan_scout"
  | "event_meteor_watch"
  | "event_mars_rush"
  | "event_storm_rider"
  | "event_eclipse_chase";

export interface MissionProfile {
  id: MissionProfileId;
  name: string;
  description: string;
  /** Minimum delta-v (m/s) to attempt */
  minDeltaV: number;
  difficulty: "easy" | "medium" | "hard";
  /** Only offered while matching sky event is active */
  eventOnly?: boolean;
  /** Primary destination for passport discovery */
  targetBody?: BodyId;
}

export const MISSION_PROFILES: MissionProfile[] = [
  {
    id: "leo",
    name: "Low Earth Orbit",
    description: "Park in LEO — checkout systems and log Earth orbits.",
    minDeltaV: 800,
    difficulty: "easy",
    targetBody: "earth",
  },
  {
    id: "lunar",
    name: "Lunar Transfer",
    description: "Climb toward the Moon’s neighborhood.",
    minDeltaV: 1800,
    difficulty: "medium",
    targetBody: "moon",
  },
  {
    id: "venus_flyby",
    name: "Venus Transfer",
    description: "Fall sunward toward Venus.",
    minDeltaV: 3000,
    difficulty: "hard",
    targetBody: "venus",
  },
  {
    id: "mercury_scout",
    name: "Mercury Scout",
    description: "Deep sunward cruise to Mercury’s realm.",
    minDeltaV: 4200,
    difficulty: "hard",
    targetBody: "mercury",
  },
  {
    id: "mars_transfer",
    name: "Mars Hohmann",
    description: "Heliocentric transfer ellipse toward Mars.",
    minDeltaV: 2800,
    difficulty: "hard",
    targetBody: "mars",
  },
  {
    id: "asteroid_belt",
    name: "Belt Scout",
    description: "Push into the main belt — Ceres country.",
    minDeltaV: 3800,
    difficulty: "hard",
    targetBody: "ceres",
  },
  {
    id: "jupiter_transfer",
    name: "Jupiter Cruise",
    description: "Long haul to the gas giant system.",
    minDeltaV: 5200,
    difficulty: "hard",
    targetBody: "jupiter",
  },
  {
    id: "europa_scout",
    name: "Europa Approach",
    description: "Jupiter transfer aimed at ice-moon science.",
    minDeltaV: 5600,
    difficulty: "hard",
    targetBody: "europa",
  },
  {
    id: "saturn_transfer",
    name: "Saturn Cruise",
    description: "Ringed giant — years of cruise condensed by warp.",
    minDeltaV: 6200,
    difficulty: "hard",
    targetBody: "saturn",
  },
  {
    id: "titan_scout",
    name: "Titan Approach",
    description: "Saturn system for methane-world recon.",
    minDeltaV: 6500,
    difficulty: "hard",
    targetBody: "titan",
  },
  {
    id: "event_meteor_watch",
    name: "Meteor Watch Orbit",
    description:
      "Event: high-inclination LEO optimized for meteor radiant observation.",
    minDeltaV: 1100,
    difficulty: "medium",
    eventOnly: true,
    targetBody: "earth",
  },
  {
    id: "event_mars_rush",
    name: "Mars Opposition Express",
    description:
      "Event: aggressive transfer window while Mars is near opposition.",
    minDeltaV: 2600,
    difficulty: "hard",
    eventOnly: true,
    targetBody: "mars",
  },
  {
    id: "event_storm_rider",
    name: "Storm Rider",
    description:
      "Event: solar-max patrol — ride elevated particle flux near Earth.",
    minDeltaV: 1400,
    difficulty: "medium",
    eventOnly: true,
    targetBody: "earth",
  },
  {
    id: "event_eclipse_chase",
    name: "Eclipse Chase",
    description:
      "Event: polar-ish LEO to maximize eclipse corridor science passes.",
    minDeltaV: 1000,
    difficulty: "medium",
    eventOnly: true,
    targetBody: "earth",
  },
];

/** Missions available right now (includes event-only when active). */
export function getAvailableMissions(
  activeEventMissionIds: MissionProfileId[] = []
): MissionProfile[] {
  return MISSION_PROFILES.filter(
    (m) => !m.eventOnly || activeEventMissionIds.includes(m.id)
  );
}

export function daysSinceEpoch(ms: number): number {
  return (ms - EPOCH_MS) / (SECONDS_PER_DAY * 1000);
}

export function planetPositionAU(planetId: BodyId, simMs: number): Vec3 {
  return bodyPositionAU(planetId, simMs);
}

/** Solve Kepler's equation M = E - e sin E */
export function eccentricAnomaly(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

export function trueAnomalyFromE(E: number, e: number): number {
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const cosNu = (cosE - e) / (1 - e * cosE);
  const sinNu = (Math.sqrt(1 - e * e) * sinE) / (1 - e * cosE);
  return Math.atan2(sinNu, cosNu);
}

export function meanMotionRadPerSec(aKm: number, mu: number): number {
  return Math.sqrt(mu / (aKm * aKm * aKm));
}

/** Position in orbital plane (perifocal), km */
export function positionPerifocal(elements: OrbitElements, simMs: number): Vec3 {
  const mu = elements.centralBody === "earth" ? MU_EARTH_KM3_S2 : MU_SUN_KM3_S2;
  const dt = (simMs - elements.epochMs) / 1000;
  const n = meanMotionRadPerSec(elements.a, mu);
  const M = (elements.meanAnomaly0 + n * dt) % (2 * Math.PI);
  const E = eccentricAnomaly(M < 0 ? M + 2 * Math.PI : M, elements.e);
  const nu = trueAnomalyFromE(E, elements.e);
  const r =
    (elements.a * (1 - elements.e * elements.e)) /
    (1 + elements.e * Math.cos(nu));
  return {
    x: r * Math.cos(nu),
    y: 0,
    z: r * Math.sin(nu),
  };
}

/** Rotate perifocal → inertial (simple 2D + slight inclination) */
export function toInertial(pos: Vec3, elements: OrbitElements): Vec3 {
  const cO = Math.cos(elements.raan);
  const sO = Math.sin(elements.raan);
  const cw = Math.cos(elements.argPeri);
  const sw = Math.sin(elements.argPeri);
  const ci = Math.cos(elements.i);
  const si = Math.sin(elements.i);

  const x =
    (cO * cw - sO * sw * ci) * pos.x + (-cO * sw - sO * cw * ci) * pos.z;
  const y = (si * sw) * pos.x + (si * cw) * pos.z;
  const z =
    (sO * cw + cO * sw * ci) * pos.x + (-sO * sw + cO * cw * ci) * pos.z;
  return { x, y, z };
}

/**
 * Craft position in scene units (AU-scale solar system).
 * LEO craft are drawn near Earth with a visual orbit ring.
 */
export function craftScenePosition(
  elements: OrbitElements,
  simMs: number
): Vec3 {
  if (elements.centralBody === "earth") {
    const earth = planetPositionAU("earth", simMs);
    const geo = toInertial(positionPerifocal(elements, simMs), elements);
    // Map LEO (~6700 km) to a small visual offset around Earth (~0.05 AU visual)
    const scale = 0.05 / 6700;
    return {
      x: earth.x + geo.x * scale,
      y: earth.y + geo.y * scale + 0.01,
      z: earth.z + geo.z * scale,
    };
  }

  const heli = toInertial(positionPerifocal(elements, simMs), elements);
  return {
    x: heli.x / AU_KM,
    y: heli.y / AU_KM,
    z: heli.z / AU_KM,
  };
}

export function periodDays(elements: OrbitElements): number {
  const mu = elements.centralBody === "earth" ? MU_EARTH_KM3_S2 : MU_SUN_KM3_S2;
  const T = 2 * Math.PI * Math.sqrt((elements.a ** 3) / mu);
  return T / SECONDS_PER_DAY;
}

function heliosTransfer(
  rpAu: number,
  raAu: number,
  earthAngle: number,
  launchMs: number,
  i = 0.04,
  /** perihelion < 1 AU (sunward) — swap so peri is inner */
  sunward = false
): OrbitElements {
  let rp = Math.min(rpAu, raAu) * AU_KM;
  let ra = Math.max(rpAu, raAu) * AU_KM;
  if (sunward) {
    rp = Math.min(rpAu, raAu) * AU_KM;
    ra = Math.max(rpAu, raAu) * AU_KM;
  }
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  return {
    a,
    e,
    i,
    raan: earthAngle,
    argPeri: sunward ? earthAngle + Math.PI : earthAngle,
    meanAnomaly0: sunward ? Math.PI : 0,
    epochMs: launchMs,
    centralBody: "sun",
  };
}

/** Build orbit elements for a mission profile at launch time */
export function createOrbitForMission(
  missionId: MissionProfileId,
  launchMs: number,
  _shipDeltaV: number
): OrbitElements {
  const earth = planetPositionAU("earth", launchMs);
  const earthAngle = Math.atan2(earth.z, earth.x);

  switch (missionId) {
    case "leo": {
      // ~400 km LEO
      const r = 6371 + 400;
      return {
        a: r,
        e: 0.001,
        i: (51.6 * Math.PI) / 180,
        raan: earthAngle,
        argPeri: 0,
        meanAnomaly0: 0,
        epochMs: launchMs,
        centralBody: "earth",
      };
    }
    case "lunar": {
      // Highly elliptical geocentric → lunar neighborhood (~60 Earth radii)
      const rp = 6371 + 300;
      const ra = 384400 * 0.9;
      const a = (rp + ra) / 2;
      const e = (ra - rp) / (ra + rp);
      return {
        a,
        e,
        i: (28 * Math.PI) / 180,
        raan: earthAngle,
        argPeri: 0,
        meanAnomaly0: 0,
        epochMs: launchMs,
        centralBody: "earth",
      };
    }
    case "mars_transfer": {
      return heliosTransfer(1.0, 1.52, earthAngle, launchMs, 0.03);
    }
    case "asteroid_belt": {
      return heliosTransfer(1.0, 2.2, earthAngle, launchMs, 0.05);
    }
    case "venus_flyby": {
      return heliosTransfer(0.72, 1.0, earthAngle, launchMs, 0.03, true);
    }
    case "mercury_scout": {
      return heliosTransfer(0.39, 1.0, earthAngle, launchMs, 0.07, true);
    }
    case "jupiter_transfer":
    case "europa_scout": {
      return heliosTransfer(1.0, 5.2, earthAngle, launchMs, 0.04);
    }
    case "saturn_transfer":
    case "titan_scout": {
      return heliosTransfer(1.0, 9.5, earthAngle, launchMs, 0.05);
    }
    case "event_meteor_watch": {
      const r = 6371 + 550;
      return {
        a: r,
        e: 0.002,
        i: (70 * Math.PI) / 180,
        raan: earthAngle,
        argPeri: 0,
        meanAnomaly0: 0,
        epochMs: launchMs,
        centralBody: "earth",
      };
    }
    case "event_mars_rush": {
      const rp = 0.98 * AU_KM;
      const ra = 1.55 * AU_KM;
      const a = (rp + ra) / 2;
      const e = (ra - rp) / (ra + rp);
      return {
        a,
        e,
        i: 0.04,
        raan: earthAngle,
        argPeri: earthAngle,
        meanAnomaly0: 0,
        epochMs: launchMs,
        centralBody: "sun",
      };
    }
    case "event_storm_rider": {
      const r = 6371 + 800;
      return {
        a: r,
        e: 0.01,
        i: (98 * Math.PI) / 180,
        raan: earthAngle,
        argPeri: 0.2,
        meanAnomaly0: 0,
        epochMs: launchMs,
        centralBody: "earth",
      };
    }
    case "event_eclipse_chase": {
      const r = 6371 + 450;
      return {
        a: r,
        e: 0.001,
        i: (88 * Math.PI) / 180,
        raan: earthAngle + 0.4,
        argPeri: 0,
        meanAnomaly0: 0,
        epochMs: launchMs,
        centralBody: "earth",
      };
    }
  }
}

export function formatDistanceAU(au: number): string {
  if (au < 0.01) return `${(au * AU_KM).toFixed(0)} km`;
  if (au < 0.1) return `${au.toFixed(4)} AU`;
  return `${au.toFixed(3)} AU`;
}

export function heliocentricDistanceAU(
  elements: OrbitElements,
  simMs: number
): number {
  const p = craftScenePosition(elements, simMs);
  return Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
}

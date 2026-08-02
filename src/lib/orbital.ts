import {
  AU_KM,
  EPOCH_MS,
  MU_EARTH_KM3_S2,
  MU_SUN_KM3_S2,
  PLANETS,
  SECONDS_PER_DAY,
  type PlanetId,
} from "./constants";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

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

export type MissionProfileId = "leo" | "lunar" | "mars_transfer" | "asteroid_belt";

export interface MissionProfile {
  id: MissionProfileId;
  name: string;
  description: string;
  /** Minimum delta-v (m/s) to attempt */
  minDeltaV: number;
  difficulty: "easy" | "medium" | "hard";
}

export const MISSION_PROFILES: MissionProfile[] = [
  {
    id: "leo",
    name: "Low Earth Orbit",
    description: "Park in LEO and watch Earth turn beneath you.",
    // Alpha thresholds are play-first (real LEO insertion is ~9.4 km/s from surface).
    minDeltaV: 800,
    difficulty: "easy",
  },
  {
    id: "lunar",
    name: "Lunar Transfer",
    description: "Escape Earth and cruise toward the Moon’s neighborhood.",
    minDeltaV: 1800,
    difficulty: "medium",
  },
  {
    id: "mars_transfer",
    name: "Mars Hohmann",
    description: "Heliocentric transfer ellipse toward Mars.",
    minDeltaV: 2800,
    difficulty: "hard",
  },
  {
    id: "asteroid_belt",
    name: "Belt Scout",
    description: "Stretch toward the inner asteroid belt (~2.2 AU).",
    minDeltaV: 3800,
    difficulty: "hard",
  },
];

export function daysSinceEpoch(ms: number): number {
  return (ms - EPOCH_MS) / (SECONDS_PER_DAY * 1000);
}

export function planetPositionAU(planetId: PlanetId, simMs: number): Vec3 {
  const p = PLANETS.find((x) => x.id === planetId);
  if (!p || p.id === "sun") return { x: 0, y: 0, z: 0 };
  const days = daysSinceEpoch(simMs);
  // Phase offset so planets aren't all lined up at epoch
  const phase = hashPhase(p.id);
  const theta = ((2 * Math.PI * days) / p.periodDays + phase) % (2 * Math.PI);
  return {
    x: p.a * Math.cos(theta),
    y: 0,
    z: p.a * Math.sin(theta),
  };
}

function hashPhase(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000 * Math.PI * 2;
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

/** Build orbit elements for a mission profile at launch time */
export function createOrbitForMission(
  missionId: MissionProfileId,
  launchMs: number,
  shipDeltaV: number
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
      // Hohmann-like: perihelion ~1 AU, aphelion ~1.52 AU
      const rp = 1.0 * AU_KM;
      const ra = 1.52 * AU_KM;
      // Bonus eccentricity stretch if high delta-v
      const bonus = Math.min(0.08, Math.max(0, (shipDeltaV - 4500) / 20000));
      const a = (rp + ra) / 2;
      const e = Math.min(0.45, (ra - rp) / (ra + rp) + bonus);
      return {
        a,
        e,
        i: 0.03,
        raan: earthAngle,
        argPeri: earthAngle,
        meanAnomaly0: 0,
        epochMs: launchMs,
        centralBody: "sun",
      };
    }
    case "asteroid_belt": {
      const rp = 1.0 * AU_KM;
      const ra = 2.2 * AU_KM;
      const a = (rp + ra) / 2;
      const e = (ra - rp) / (ra + rp);
      return {
        a,
        e,
        i: 0.05,
        raan: earthAngle,
        argPeri: earthAngle,
        meanAnomaly0: 0,
        epochMs: launchMs,
        centralBody: "sun",
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

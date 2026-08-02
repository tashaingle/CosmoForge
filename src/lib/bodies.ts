/**
 * Solar-system body catalog for CosmoForge.
 * Positions are Keplerian approximations (not full SPICE), tuned to feel
 * “real enough” vs calendar time while staying cheap to compute.
 *
 * Elements roughly aligned with J2000-style mean values (simplified).
 */

export const AU_KM = 149_597_870.7;
export const EARTH_RADIUS_KM = 6371;
export const MU_SUN_KM3_S2 = 1.32712440018e11;
export const MU_EARTH_KM3_S2 = 3.986004418e5;
export const SECONDS_PER_DAY = 86400;
export const SCENE_AU = 1;
/** J2000 epoch */
export const EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

export type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "ceres"
  // moons
  | "moon"
  | "phobos"
  | "deimos"
  | "io"
  | "europa"
  | "ganymede"
  | "callisto"
  | "titan"
  | "enceladus"
  | "triton";

/** @deprecated use BodyId — kept for existing imports */
export type PlanetId = BodyId;

export interface BodyDef {
  id: BodyId;
  name: string;
  kind: "star" | "planet" | "dwarf" | "moon";
  /** Parent for moons */
  parentId?: BodyId;
  /** Semi-major axis: AU for heliocentric, km for moons */
  a: number;
  /** Eccentricity */
  e: number;
  /** Inclination deg */
  incDeg: number;
  /** Longitude of perihelion / periapsis deg */
  periDeg: number;
  /** Mean longitude at epoch deg (L0) */
  L0Deg: number;
  /** Orbital period Earth days */
  periodDays: number;
  /** Visual sphere radius (scene units) */
  visualRadius: number;
  /**
   * For moons: exaggerated orbital radius in scene units so they’re visible.
   * True a is still used for science copy.
   */
  visualOrbitAu?: number;
  color: string;
  emissive?: string;
  /** Discovery / passport blurb */
  blurb: string;
}

export const BODIES: BodyDef[] = [
  {
    id: "sun",
    name: "Sun",
    kind: "star",
    a: 0,
    e: 0,
    incDeg: 0,
    periDeg: 0,
    L0Deg: 0,
    periodDays: 0,
    visualRadius: 0.14,
    color: "#ffcc33",
    emissive: "#ff9900",
    blurb: "The gravity well everything falls around.",
  },
  // Planets — a in AU, simplified Kepler
  {
    id: "mercury",
    name: "Mercury",
    kind: "planet",
    a: 0.387,
    e: 0.206,
    incDeg: 7.0,
    periDeg: 77.5,
    L0Deg: 252.3,
    periodDays: 87.97,
    visualRadius: 0.016,
    color: "#a8a29e",
    blurb: "Scorched innermost world.",
  },
  {
    id: "venus",
    name: "Venus",
    kind: "planet",
    a: 0.723,
    e: 0.007,
    incDeg: 3.4,
    periDeg: 131.6,
    L0Deg: 181.98,
    periodDays: 224.7,
    visualRadius: 0.026,
    color: "#e8c07d",
    blurb: "Thick atmosphere, hellish surface.",
  },
  {
    id: "earth",
    name: "Earth",
    kind: "planet",
    a: 1.0,
    e: 0.017,
    incDeg: 0,
    periDeg: 102.9,
    L0Deg: 100.46,
    periodDays: 365.256,
    visualRadius: 0.028,
    color: "#3b82f6",
    blurb: "Home. Launch pad for every CosmoForge flight.",
  },
  {
    id: "mars",
    name: "Mars",
    kind: "planet",
    a: 1.524,
    e: 0.093,
    incDeg: 1.85,
    periDeg: 336.0,
    L0Deg: 355.45,
    periodDays: 686.98,
    visualRadius: 0.02,
    color: "#ef4444",
    blurb: "The next human horizon.",
  },
  {
    id: "ceres",
    name: "Ceres",
    kind: "dwarf",
    a: 2.77,
    e: 0.076,
    incDeg: 10.6,
    periDeg: 73.6,
    L0Deg: 0,
    periodDays: 1681.6,
    visualRadius: 0.014,
    color: "#94a3b8",
    blurb: "Largest belt object — ice & rock.",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    kind: "planet",
    a: 5.203,
    e: 0.049,
    incDeg: 1.3,
    periDeg: 14.3,
    L0Deg: 34.4,
    periodDays: 4332.59,
    visualRadius: 0.085,
    color: "#d4a574",
    blurb: "King of planets; moon system is a mini solar system.",
  },
  {
    id: "saturn",
    name: "Saturn",
    kind: "planet",
    a: 9.537,
    e: 0.057,
    incDeg: 2.5,
    periDeg: 93.1,
    L0Deg: 50.1,
    periodDays: 10759.22,
    visualRadius: 0.072,
    color: "#f0d9a0",
    blurb: "Rings + Titan: chemistry lab of the outer system.",
  },
  {
    id: "uranus",
    name: "Uranus",
    kind: "planet",
    a: 19.191,
    e: 0.046,
    incDeg: 0.77,
    periDeg: 173.0,
    L0Deg: 314.05,
    periodDays: 30688.5,
    visualRadius: 0.048,
    color: "#7dd3fc",
    blurb: "Ice giant on its side.",
  },
  {
    id: "neptune",
    name: "Neptune",
    kind: "planet",
    a: 30.069,
    e: 0.011,
    incDeg: 1.77,
    periDeg: 48.1,
    L0Deg: 304.35,
    periodDays: 60182,
    visualRadius: 0.046,
    color: "#2563eb",
    blurb: "Windy ice giant; Triton orbits backward.",
  },
  {
    id: "pluto",
    name: "Pluto",
    kind: "dwarf",
    a: 39.48,
    e: 0.249,
    incDeg: 17.1,
    periDeg: 224.1,
    L0Deg: 238.93,
    periodDays: 90560,
    visualRadius: 0.015,
    color: "#cbd5e1",
    blurb: "Kuiper classic — heart-shaped plains await.",
  },
  // Moons — a in km from parent; visualOrbitAu exaggerated for display
  {
    id: "moon",
    name: "Moon",
    kind: "moon",
    parentId: "earth",
    a: 384400,
    e: 0.055,
    incDeg: 5.1,
    periDeg: 0,
    L0Deg: 0,
    periodDays: 27.32,
    visualRadius: 0.01,
    visualOrbitAu: 0.07,
    color: "#e2e8f0",
    blurb: "Earth’s companion — first stepping stone.",
  },
  {
    id: "phobos",
    name: "Phobos",
    kind: "moon",
    parentId: "mars",
    a: 9376,
    e: 0.015,
    incDeg: 1.1,
    periDeg: 0,
    L0Deg: 40,
    periodDays: 0.319,
    visualRadius: 0.006,
    visualOrbitAu: 0.04,
    color: "#a8a29e",
    blurb: "Doomed potato moon of Mars.",
  },
  {
    id: "deimos",
    name: "Deimos",
    kind: "moon",
    parentId: "mars",
    a: 23463,
    e: 0.0003,
    incDeg: 1.8,
    periDeg: 0,
    L0Deg: 120,
    periodDays: 1.26,
    visualRadius: 0.005,
    visualOrbitAu: 0.055,
    color: "#78716c",
    blurb: "Outer Martian moon.",
  },
  {
    id: "io",
    name: "Io",
    kind: "moon",
    parentId: "jupiter",
    a: 421700,
    e: 0.004,
    incDeg: 0.04,
    periDeg: 0,
    L0Deg: 0,
    periodDays: 1.77,
    visualRadius: 0.012,
    visualOrbitAu: 0.12,
    color: "#fbbf24",
    blurb: "Most volcanic body in the solar system.",
  },
  {
    id: "europa",
    name: "Europa",
    kind: "moon",
    parentId: "jupiter",
    a: 671034,
    e: 0.009,
    incDeg: 0.47,
    periDeg: 0,
    L0Deg: 90,
    periodDays: 3.55,
    visualRadius: 0.011,
    visualOrbitAu: 0.16,
    color: "#bfdbfe",
    blurb: "Ice shell over a hidden ocean.",
  },
  {
    id: "ganymede",
    name: "Ganymede",
    kind: "moon",
    parentId: "jupiter",
    a: 1070412,
    e: 0.001,
    incDeg: 0.2,
    periDeg: 0,
    L0Deg: 180,
    periodDays: 7.15,
    visualRadius: 0.014,
    visualOrbitAu: 0.2,
    color: "#94a3b8",
    blurb: "Largest moon in the solar system.",
  },
  {
    id: "callisto",
    name: "Callisto",
    kind: "moon",
    parentId: "jupiter",
    a: 1882709,
    e: 0.007,
    incDeg: 0.19,
    periDeg: 0,
    L0Deg: 270,
    periodDays: 16.69,
    visualRadius: 0.013,
    visualOrbitAu: 0.26,
    color: "#64748b",
    blurb: "Ancient cratered ice world.",
  },
  {
    id: "titan",
    name: "Titan",
    kind: "moon",
    parentId: "saturn",
    a: 1221870,
    e: 0.029,
    incDeg: 0.35,
    periDeg: 0,
    L0Deg: 50,
    periodDays: 15.95,
    visualRadius: 0.014,
    visualOrbitAu: 0.18,
    color: "#f59e0b",
    blurb: "Thick air, methane lakes.",
  },
  {
    id: "enceladus",
    name: "Enceladus",
    kind: "moon",
    parentId: "saturn",
    a: 238040,
    e: 0.005,
    incDeg: 0.02,
    periDeg: 0,
    L0Deg: 200,
    periodDays: 1.37,
    visualRadius: 0.008,
    visualOrbitAu: 0.1,
    color: "#e0f2fe",
    blurb: "Ice geysers feeding Saturn’s E ring.",
  },
  {
    id: "triton",
    name: "Triton",
    kind: "moon",
    parentId: "neptune",
    a: 354759,
    e: 0.00002,
    incDeg: 157, // retrograde
    periDeg: 0,
    L0Deg: 0,
    periodDays: 5.88,
    visualRadius: 0.011,
    visualOrbitAu: 0.12,
    color: "#a5b4fc",
    blurb: "Captured Kuiper object in reverse orbit.",
  },
];

/** Planets + dwarfs + sun (no moons) — orbit rings */
export const PLANETS = BODIES.filter((b) => b.kind !== "moon");

export const MOONS = BODIES.filter((b) => b.kind === "moon");

export function getBody(id: BodyId): BodyDef | undefined {
  return BODIES.find((b) => b.id === id);
}

export function daysSinceEpoch(ms: number): number {
  return (ms - EPOCH_MS) / (SECONDS_PER_DAY * 1000);
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

function wrap2pi(a: number): number {
  const t = a % (Math.PI * 2);
  return t < 0 ? t + Math.PI * 2 : t;
}

function solveKepler(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 12; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-10) break;
  }
  return E;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Heliocentric position in AU (planets/dwarfs) or parent-relative exaggerated for moons */
export function bodyPositionAU(id: BodyId, simMs: number): Vec3 {
  const b = getBody(id);
  if (!b || b.id === "sun") return { x: 0, y: 0, z: 0 };

  if (b.kind === "moon" && b.parentId) {
    const parent = bodyPositionAU(b.parentId, simMs);
    const days = daysSinceEpoch(simMs);
    const phase = deg2rad(b.L0Deg) + (2 * Math.PI * days) / b.periodDays;
    const r = b.visualOrbitAu ?? 0.08;
    const inc = deg2rad(b.incDeg);
    return {
      x: parent.x + r * Math.cos(phase),
      y: parent.y + r * Math.sin(inc) * Math.sin(phase) * 0.35,
      z: parent.z + r * Math.cos(inc) * Math.sin(phase),
    };
  }

  // Heliocentric Kepler (2D + slight inclination)
  const days = daysSinceEpoch(simMs);
  const n = (2 * Math.PI) / b.periodDays; // rad/day
  const L = deg2rad(b.L0Deg) + n * days;
  const peri = deg2rad(b.periDeg);
  const M = wrap2pi(L - peri);
  const E = solveKepler(M, b.e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const r = b.a * (1 - b.e * cosE);
  const trueAnom =
    Math.atan2(Math.sqrt(1 - b.e * b.e) * sinE, cosE - b.e) || 0;
  const u = trueAnom + peri;
  const inc = deg2rad(b.incDeg);
  return {
    x: r * Math.cos(u),
    y: r * Math.sin(u) * Math.sin(inc) * 0.4,
    z: r * Math.sin(u) * Math.cos(inc),
  };
}

/** Alias used across codebase */
export function planetPositionAU(planetId: BodyId, simMs: number): Vec3 {
  return bodyPositionAU(planetId, simMs);
}

/** Bodies you can “discover” for the solar passport */
export const PASSPORT_BODIES = BODIES.filter((b) => b.id !== "sun");

export const TIME_SCALES = [
  { label: "1×", value: 1 },
  { label: "10×", value: 10 },
  { label: "100×", value: 100 },
  { label: "1k×", value: 1_000 },
  { label: "10k×", value: 10_000 },
  { label: "100k×", value: 100_000 },
  { label: "1M×", value: 1_000_000 },
] as const;

/** Visualization & physics constants for CosmoForge Alpha */

export const AU_KM = 149_597_870.7;
export const EARTH_RADIUS_KM = 6371;
export const MU_SUN_KM3_S2 = 1.32712440018e11;
export const MU_EARTH_KM3_S2 = 3.986004418e5;
export const SECONDS_PER_DAY = 86400;

/** Visual scale: 1 scene unit ≈ 1 AU for solar-system view */
export const SCENE_AU = 1;

export type PlanetId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export interface PlanetDef {
  id: PlanetId;
  name: string;
  /** Semi-major axis in AU */
  a: number;
  /** Orbital period in Earth days */
  periodDays: number;
  /** Display radius in scene units (not to scale) */
  visualRadius: number;
  color: string;
  emissive?: string;
}

/** Simplified circular coplanar orbits — good enough for Alpha */
export const PLANETS: PlanetDef[] = [
  {
    id: "sun",
    name: "Sun",
    a: 0,
    periodDays: 0,
    visualRadius: 0.12,
    color: "#ffcc33",
    emissive: "#ff9900",
  },
  {
    id: "mercury",
    name: "Mercury",
    a: 0.387,
    periodDays: 87.97,
    visualRadius: 0.018,
    color: "#9e9e9e",
  },
  {
    id: "venus",
    name: "Venus",
    a: 0.723,
    periodDays: 224.7,
    visualRadius: 0.028,
    color: "#e6c07b",
  },
  {
    id: "earth",
    name: "Earth",
    a: 1.0,
    periodDays: 365.25,
    visualRadius: 0.03,
    color: "#3b82f6",
  },
  {
    id: "mars",
    name: "Mars",
    a: 1.524,
    periodDays: 686.98,
    visualRadius: 0.022,
    color: "#ef4444",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    a: 5.203,
    periodDays: 4332.59,
    visualRadius: 0.08,
    color: "#d4a574",
  },
  {
    id: "saturn",
    name: "Saturn",
    a: 9.537,
    periodDays: 10759.22,
    visualRadius: 0.07,
    color: "#f0d9a0",
  },
  {
    id: "uranus",
    name: "Uranus",
    a: 19.191,
    periodDays: 30688.5,
    visualRadius: 0.045,
    color: "#7dd3fc",
  },
  {
    id: "neptune",
    name: "Neptune",
    a: 30.069,
    periodDays: 60182,
    visualRadius: 0.044,
    color: "#2563eb",
  },
];

export const TIME_SCALES = [
  { label: "1×", value: 1 },
  { label: "10×", value: 10 },
  { label: "100×", value: 100 },
  { label: "1k×", value: 1_000 },
  { label: "10k×", value: 10_000 },
  { label: "100k×", value: 100_000 },
] as const;

/** J2000-ish epoch for alpha (fixed reference) */
export const EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/**
 * Texture + atmosphere + ring config for photoreal-ish bodies.
 * Maps: Solar System Scope (CC-BY 4.0) + three.js examples (NASA-derived).
 */

import type { BodyId } from "./bodies";

export interface AtmosphereVisual {
  color: string;
  /** Shell opacity */
  intensity: number;
  /** Multiplier on body radius */
  scale: number;
}

export interface RingVisual {
  /** Optional texture (R or alpha used as density) */
  map?: string;
  inner: number;
  outer: number;
  /** X-axis tilt in radians */
  tilt: number;
  color: string;
  opacity: number;
}

export interface BodyVisual {
  /** Diffuse map under /public */
  map?: string;
  /** Emissive map (sun) */
  emissiveMap?: boolean;
  emissiveIntensity?: number;
  roughness: number;
  metalness: number;
  /** Tint multiplied on the map (for shared moon textures) */
  tint?: string;
  atmosphere?: AtmosphereVisual;
  rings?: RingVisual;
  /** Sidereal rotation period in Earth days (visual spin) */
  spinDays: number;
  /** Axial tilt radians for mesh group */
  axialTilt?: number;
}

const T = "/textures/bodies";

/** Primary planets, dwarf planets, major moons */
export const BODY_VISUALS: Partial<Record<BodyId, BodyVisual>> = {
  sun: {
    map: `${T}/sun.jpg`,
    emissiveMap: true,
    emissiveIntensity: 1.35,
    roughness: 0.4,
    metalness: 0,
    spinDays: 25,
  },
  mercury: {
    map: `${T}/mercury.jpg`,
    roughness: 0.92,
    metalness: 0.15,
    spinDays: 58.6,
    axialTilt: 0.01,
  },
  venus: {
    map: `${T}/venus.jpg`,
    roughness: 0.55,
    metalness: 0.05,
    spinDays: -243, // retrograde
    atmosphere: { color: "#fde68a", intensity: 0.38, scale: 1.14 },
    axialTilt: 3.1,
  },
  // Earth uses dedicated EarthGlobe
  mars: {
    map: `${T}/mars.jpg`,
    roughness: 0.88,
    metalness: 0.08,
    spinDays: 1.03,
    atmosphere: { color: "#fb923c", intensity: 0.18, scale: 1.08 },
    axialTilt: 0.44,
  },
  ceres: {
    map: `${T}/ceres.jpg`,
    roughness: 0.95,
    metalness: 0.05,
    spinDays: 0.38,
  },
  jupiter: {
    map: `${T}/jupiter.jpg`,
    roughness: 0.55,
    metalness: 0.05,
    spinDays: 0.41,
    atmosphere: { color: "#f0c890", intensity: 0.22, scale: 1.06 },
    axialTilt: 0.05,
  },
  saturn: {
    map: `${T}/saturn.jpg`,
    roughness: 0.55,
    metalness: 0.05,
    spinDays: 0.44,
    atmosphere: { color: "#f5e6c8", intensity: 0.18, scale: 1.05 },
    rings: {
      // Small alpha map is low-res; procedural bands look better at system scale
      inner: 1.25,
      outer: 2.25,
      tilt: Math.PI / 2.35,
      color: "#e8d5a8",
      opacity: 0.88,
    },
    axialTilt: 0.47,
  },
  uranus: {
    map: `${T}/uranus.jpg`,
    roughness: 0.5,
    metalness: 0.05,
    spinDays: -0.72,
    atmosphere: { color: "#a5f3fc", intensity: 0.2, scale: 1.07 },
    rings: {
      inner: 1.4,
      outer: 1.9,
      tilt: Math.PI / 2.05,
      color: "#a5f3fc",
      opacity: 0.35,
    },
    axialTilt: 1.71, // ~98° — on its side
  },
  neptune: {
    map: `${T}/neptune.jpg`,
    roughness: 0.5,
    metalness: 0.05,
    spinDays: 0.67,
    atmosphere: { color: "#3b82f6", intensity: 0.22, scale: 1.07 },
    axialTilt: 0.49,
  },
  pluto: {
    map: `${T}/makemake.jpg`,
    roughness: 0.9,
    metalness: 0.08,
    tint: "#e2d5c8",
    spinDays: 6.4,
    axialTilt: 2.1,
  },
  moon: {
    map: `${T}/moon.jpg`,
    roughness: 0.95,
    metalness: 0.05,
    spinDays: 27.3,
    axialTilt: 0.12,
  },
  phobos: {
    map: `${T}/ceres.jpg`,
    roughness: 0.98,
    metalness: 0.05,
    tint: "#a8a29e",
    spinDays: 0.32,
  },
  deimos: {
    map: `${T}/ceres.jpg`,
    roughness: 0.98,
    metalness: 0.05,
    tint: "#78716c",
    spinDays: 1.26,
  },
  io: {
    map: `${T}/haumea.jpg`,
    roughness: 0.75,
    metalness: 0.1,
    tint: "#fbbf24",
    spinDays: 1.77,
  },
  europa: {
    map: `${T}/eris.jpg`,
    roughness: 0.55,
    metalness: 0.12,
    tint: "#dbeafe",
    spinDays: 3.55,
  },
  ganymede: {
    map: `${T}/moon.jpg`,
    roughness: 0.85,
    metalness: 0.08,
    tint: "#cbd5e1",
    spinDays: 7.15,
  },
  callisto: {
    map: `${T}/ceres.jpg`,
    roughness: 0.9,
    metalness: 0.06,
    tint: "#78716c",
    spinDays: 16.7,
  },
  titan: {
    map: `${T}/venus.jpg`,
    roughness: 0.65,
    metalness: 0.05,
    tint: "#fdba74",
    spinDays: 15.9,
    atmosphere: { color: "#fb923c", intensity: 0.35, scale: 1.12 },
  },
  enceladus: {
    map: `${T}/eris.jpg`,
    roughness: 0.4,
    metalness: 0.15,
    tint: "#f8fafc",
    spinDays: 1.37,
  },
  triton: {
    map: `${T}/eris.jpg`,
    roughness: 0.7,
    metalness: 0.1,
    tint: "#93c5fd",
    spinDays: -5.88,
  },
};

export function getBodyVisual(id: BodyId): BodyVisual | undefined {
  return BODY_VISUALS[id];
}

/** All map URLs for optional preload */
export function allBodyTextureUrls(): string[] {
  const urls = new Set<string>();
  for (const v of Object.values(BODY_VISUALS)) {
    if (v?.map) urls.add(v.map);
    if (v?.rings?.map) urls.add(v.rings.map);
  }
  urls.add("/textures/earth/day.jpg");
  urls.add("/textures/earth/night.jpg");
  urls.add("/textures/earth/specular.jpg");
  urls.add("/textures/earth/clouds.jpg");
  return [...urls];
}

/**
 * Re-export body catalog so existing imports keep working.
 * Prefer `@/lib/bodies` for new code.
 */
export {
  AU_KM,
  EARTH_RADIUS_KM,
  MU_SUN_KM3_S2,
  MU_EARTH_KM3_S2,
  SECONDS_PER_DAY,
  SCENE_AU,
  EPOCH_MS,
  PLANETS,
  BODIES,
  MOONS,
  TIME_SCALES,
  type BodyId,
  type PlanetId,
  type BodyDef,
} from "./bodies";

export type { BodyDef as PlanetDef } from "./bodies";

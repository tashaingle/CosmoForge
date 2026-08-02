/**
 * Client-side ephemeris cache + interpolation.
 */

import type { BodyId, Vec3 } from "./bodies";

/** Mirrors server EphemerisBundle — keep client free of Horizons fetch code */
export type Sample = { t: number; x: number; y: number; z: number };

export type EphemerisBundle = {
  version: 1;
  provider: string;
  generatedAt: number;
  startMs: number;
  endMs: number;
  stepHours: number;
  bodies: Record<string, Sample[]>;
  errors: string[];
  sources: string[];
};

function interpolateSample(
  samples: Sample[],
  t: number
): { x: number; y: number; z: number } | null {
  if (!samples.length) return null;
  if (t <= samples[0].t) {
    return { x: samples[0].x, y: samples[0].y, z: samples[0].z };
  }
  const last = samples[samples.length - 1];
  if (t >= last.t) {
    return { x: last.x, y: last.y, z: last.z };
  }
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const u = (t - a.t) / (b.t - a.t || 1);
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    z: a.z + (b.z - a.z) * u,
  };
}

let bundle: EphemerisBundle | null = null;
let loadPromise: Promise<EphemerisBundle | null> | null = null;
let lastError: string | null = null;

export function getEphemerisMeta(): {
  ready: boolean;
  provider: string | null;
  generatedAt: number | null;
  bodyCount: number;
  errors: string[];
  lastError: string | null;
} {
  return {
    ready: Boolean(bundle && Object.keys(bundle.bodies).length > 1),
    provider: bundle?.provider ?? null,
    generatedAt: bundle?.generatedAt ?? null,
    bodyCount: bundle ? Object.keys(bundle.bodies).length : 0,
    errors: bundle?.errors ?? [],
    lastError,
  };
}

export function getEphemerisBundle(): EphemerisBundle | null {
  return bundle;
}

/** Load / refresh from /api/ephemeris (cached server-side). */
export async function ensureEphemeris(
  force = false
): Promise<EphemerisBundle | null> {
  if (bundle && !force) return bundle;
  if (loadPromise && !force) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch("/api/ephemeris", {
        // allow browser cache short-term
        cache: "no-store",
      });
      if (!res.ok) {
        lastError = `Ephemeris HTTP ${res.status}`;
        return bundle;
      }
      const data = (await res.json()) as EphemerisBundle;
      if (data?.version === 1 && data.bodies) {
        bundle = data;
        lastError = data.errors?.length
          ? data.errors.slice(0, 2).join("; ")
          : null;
        return bundle;
      }
      lastError = "Invalid ephemeris payload";
      return bundle;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Ephemeris fetch failed";
      return bundle;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function ephemerisPositionAU(
  bodyId: BodyId,
  simMs: number
): Vec3 | null {
  if (!bundle) return null;
  if (bodyId === "sun") return { x: 0, y: 0, z: 0 };
  const samples = bundle.bodies[bodyId] as Sample[] | undefined;
  if (!samples?.length) return null;
  return interpolateSample(samples, simMs);
}

export function hasEphemerisBody(bodyId: BodyId): boolean {
  return Boolean(bundle?.bodies[bodyId]?.length);
}

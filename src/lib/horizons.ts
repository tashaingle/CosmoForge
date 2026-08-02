/**
 * JPL Horizons fetch + parse (server-side).
 * Docs: https://ssd.jpl.nasa.gov/api/horizons.api
 */

import type { BodyId } from "./bodies";

const HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";

/** Horizons major-body IDs (heliocentric: CENTER=@10 Sun) */
export const HORIZONS_BODY_IDS: Partial<
  Record<BodyId, { command: string; center: string }>
> = {
  mercury: { command: "199", center: "@10" },
  venus: { command: "299", center: "@10" },
  earth: { command: "399", center: "@10" },
  moon: { command: "301", center: "@10" }, // geocentric moon as heliocentric position
  mars: { command: "499", center: "@10" },
  ceres: { command: "1;", center: "@10" }, // small body needs semicolon
  jupiter: { command: "599", center: "@10" },
  saturn: { command: "699", center: "@10" },
  uranus: { command: "799", center: "@10" },
  neptune: { command: "899", center: "@10" },
  pluto: { command: "999", center: "@10" },
};

/** Phase 1 bodies */
export const EPHEMERIS_BODIES: BodyId[] = [
  "mercury",
  "venus",
  "earth",
  "moon",
  "mars",
  "ceres",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

export type Sample = {
  t: number; // unix ms
  x: number; // AU ecliptic X
  y: number; // AU ecliptic Z (out of plane) — mapped for our scene Y
  z: number; // AU ecliptic Y — mapped for our scene Z
};

export type BodySamples = {
  bodyId: BodyId;
  samples: Sample[];
  source: string;
};

export type EphemerisBundle = {
  version: 1;
  provider: "JPL Horizons";
  generatedAt: number;
  startMs: number;
  endMs: number;
  stepHours: number;
  bodies: Record<string, Sample[]>;
  errors: string[];
  sources: string[];
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseHorizonsCsv(result: string): Sample[] {
  const soe = result.indexOf("$$SOE");
  const eoe = result.indexOf("$$EOE");
  if (soe < 0 || eoe < 0) return [];
  const block = result.slice(soe + 5, eoe).trim();
  const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const samples: Sample[] = [];

  for (const line of lines) {
    // CSV: JD, A.D. date, X, Y, Z,
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 5) continue;
    const jd = parseFloat(parts[0]);
    const x = parseFloat(parts[2]);
    const yEcl = parseFloat(parts[3]);
    const zEcl = parseFloat(parts[4]);
    if (![jd, x, yEcl, zEcl].every(Number.isFinite)) continue;
    // JD → unix ms: JD 2440587.5 = 1970-01-01
    const t = Math.round((jd - 2440587.5) * 86400000);
    // Map ecliptic (X,Y,Z) → scene (x, y-up-ish, z): use X, Z, Y
    samples.push({ t, x, y: zEcl, z: yEcl });
  }
  return samples;
}

export async function fetchHorizonsBody(
  bodyId: BodyId,
  start: Date,
  stop: Date,
  stepHours: number
): Promise<{ samples: Sample[]; source?: string; error?: string }> {
  const cfg = HORIZONS_BODY_IDS[bodyId];
  if (!cfg) return { samples: [], error: `No Horizons id for ${bodyId}` };

  const params = new URLSearchParams({
    format: "json",
    COMMAND: cfg.command.includes(";") ? cfg.command : `'${cfg.command}'`,
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "VECTORS",
    CENTER: cfg.center,
    START_TIME: ymd(start),
    STOP_TIME: ymd(stop),
    STEP_SIZE: `${stepHours}h`,
    OUT_UNITS: "AU-D",
    VEC_TABLE: "1",
    REF_PLANE: "ECLIPTIC",
    VEC_LABELS: "NO",
    CSV_FORMAT: "YES",
  });

  // Ceres uses COMMAND='1;' which must encode carefully
  let url = `${HORIZONS_URL}?${params.toString()}`;
  if (bodyId === "ceres") {
    url = `${HORIZONS_URL}?format=json&COMMAND='1%3B'&OBJ_DATA=NO&MAKE_EPHEM=YES&EPHEM_TYPE=VECTORS&CENTER=@10&START_TIME=${ymd(start)}&STOP_TIME=${ymd(stop)}&STEP_SIZE=${stepHours}h&OUT_UNITS=AU-D&VEC_TABLE=1&REF_PLANE=ECLIPTIC&VEC_LABELS=NO&CSV_FORMAT=YES`;
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      // allow Next to cache successful Horizon pulls briefly
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return { samples: [], error: `Horizons HTTP ${res.status} for ${bodyId}` };
    }
    const json = (await res.json()) as {
      result?: string;
      error?: string;
      signature?: { source?: string };
    };
    if (json.error) {
      return { samples: [], error: `${bodyId}: ${json.error}` };
    }
    if (!json.result) {
      return { samples: [], error: `${bodyId}: empty result` };
    }
    const samples = parseHorizonsCsv(json.result);
    if (samples.length === 0) {
      return { samples: [], error: `${bodyId}: parse produced 0 samples` };
    }
    const sourceMatch = json.result.match(/\{source:\s*([^}]+)\}/);
    return {
      samples,
      source: sourceMatch?.[1]?.trim() || json.signature?.source || "Horizons",
    };
  } catch (e) {
    return {
      samples: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function buildEphemerisBundle(options?: {
  /** Days of history before now */
  pastDays?: number;
  /** Days of future ahead of now */
  futureDays?: number;
  stepHours?: number;
}): Promise<EphemerisBundle> {
  const pastDays = options?.pastDays ?? 14;
  const futureDays = options?.futureDays ?? 120;
  const stepHours = options?.stepHours ?? 12;

  const now = Date.now();
  const start = new Date(now - pastDays * 86400000);
  const stop = new Date(now + futureDays * 86400000);

  const bodies: Record<string, Sample[]> = {};
  const errors: string[] = [];
  const sources: string[] = [];

  // Parallel batches of 3 (faster on serverless; still polite to JPL)
  const ids = [...EPHEMERIS_BODIES];
  for (let i = 0; i < ids.length; i += 3) {
    const chunk = ids.slice(i, i + 3);
    const results = await Promise.all(
      chunk.map((id) => fetchHorizonsBody(id, start, stop, stepHours))
    );
    chunk.forEach((id, j) => {
      const { samples, source, error } = results[j];
      if (error) errors.push(error);
      if (samples.length) {
        bodies[id] = samples;
        if (source) sources.push(`${id}:${source}`);
      }
    });
  }

  // Sun at origin always
  bodies.sun = [
    { t: start.getTime(), x: 0, y: 0, z: 0 },
    { t: stop.getTime(), x: 0, y: 0, z: 0 },
  ];

  return {
    version: 1,
    provider: "JPL Horizons",
    generatedAt: Date.now(),
    startMs: start.getTime(),
    endMs: stop.getTime(),
    stepHours,
    bodies,
    errors,
    sources: [...new Set(sources)],
  };
}

export function interpolateSample(
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
  // binary search
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

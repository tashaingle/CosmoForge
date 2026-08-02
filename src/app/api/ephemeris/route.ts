import { NextResponse } from "next/server";
import {
  buildEphemerisBundle,
  type EphemerisBundle,
} from "@/lib/horizons";

export const runtime = "nodejs";
export const maxDuration = 120;

type CacheBox = { at: number; body: EphemerisBundle };
let memoryCache: CacheBox | null = null;

/** 6 hours — Horizons is slow; clients interpolate between samples */
const TTL_MS = 6 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";

  if (!force && memoryCache && Date.now() - memoryCache.at < TTL_MS) {
    return NextResponse.json(memoryCache.body, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=21600",
        "X-Ephemeris-Cache": "HIT",
      },
    });
  }

  try {
    const body = await buildEphemerisBundle({
      pastDays: 10,
      futureDays: 90,
      stepHours: 12,
    });
    memoryCache = { at: Date.now(), body };
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=21600",
        "X-Ephemeris-Cache": force ? "REFRESH" : "MISS",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ephemeris build failed";
    if (memoryCache) {
      return NextResponse.json(
        { ...memoryCache.body, errors: [...memoryCache.body.errors, message] },
        {
          status: 200,
          headers: { "X-Ephemeris-Cache": "STALE" },
        }
      );
    }
    return NextResponse.json(
      {
        version: 1,
        provider: "JPL Horizons",
        generatedAt: Date.now(),
        startMs: 0,
        endMs: 0,
        stepHours: 12,
        bodies: { sun: [{ t: Date.now(), x: 0, y: 0, z: 0 }] },
        errors: [message],
        sources: [],
      } satisfies EphemerisBundle,
      { status: 503 }
    );
  }
}

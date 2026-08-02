import { NextResponse } from "next/server";
import {
  cadRowsToFeedItems,
  donkiCmesToFeedItems,
  donkiFlaresToFeedItems,
  type LiveFeedItem,
  type SkyFeedResponse,
} from "@/lib/jpl-feed";
import { getActiveSkyEvents, getUpcomingSkyEvents } from "@/lib/sky-events";

export const runtime = "nodejs";
export const revalidate = 1800; // 30 min CDN cache hint

type CacheBox = { at: number; body: SkyFeedResponse };
let memoryCache: CacheBox | null = null;
const TTL_MS = 30 * 60 * 1000;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchJplCad(): Promise<{
  items: LiveFeedItem[];
  error?: string;
}> {
  try {
    const now = new Date();
    const min = new Date(now.getTime() - 7 * 86400_000);
    const max = new Date(now.getTime() + 60 * 86400_000);
    const url = new URL("https://ssd-api.jpl.nasa.gov/cad.api");
    url.searchParams.set("dist-max", "0.05");
    url.searchParams.set("date-min", ymd(min));
    url.searchParams.set("date-max", ymd(max));
    url.searchParams.set("sort", "date");
    url.searchParams.set("limit", "25");

    const res = await fetch(url.toString(), {
      next: { revalidate: 1800 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { items: [], error: `JPL CAD HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      fields?: string[];
      data?: string[][];
      count?: string;
    };
    if (!json.fields || !json.data) {
      return { items: [], error: "JPL CAD empty payload" };
    }
    return { items: cadRowsToFeedItems(json.fields, json.data) };
  } catch (e) {
    return {
      items: [],
      error: e instanceof Error ? e.message : "JPL CAD fetch failed",
    };
  }
}

async function fetchNasaDonki(): Promise<{
  items: LiveFeedItem[];
  error?: string;
}> {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  try {
    const now = new Date();
    // Shorter window = less CME noise in the UI
    const start = new Date(now.getTime() - 3 * 86400_000);
    const end = new Date(now.getTime() + 1 * 86400_000);
    const base = "https://api.nasa.gov/DONKI";
    const q = `startDate=${ymd(start)}&endDate=${ymd(end)}&api_key=${key}`;

    const [flrRes, cmeRes] = await Promise.all([
      fetch(`${base}/FLR?${q}`, { next: { revalidate: 1800 } }),
      fetch(`${base}/CME?${q}`, { next: { revalidate: 1800 } }),
    ]);

    const items: LiveFeedItem[] = [];
    const errors: string[] = [];

    if (flrRes.ok) {
      const flares = await flrRes.json();
      if (Array.isArray(flares)) {
        items.push(...donkiFlaresToFeedItems(flares));
      }
    } else {
      errors.push(`DONKI FLR HTTP ${flrRes.status}`);
    }

    if (cmeRes.ok) {
      const cmes = await cmeRes.json();
      if (Array.isArray(cmes)) {
        items.push(...donkiCmesToFeedItems(cmes));
      }
    } else {
      errors.push(`DONKI CME HTTP ${cmeRes.status}`);
    }

    return {
      items,
      error: errors.length ? errors.join("; ") : undefined,
    };
  } catch (e) {
    return {
      items: [],
      error: e instanceof Error ? e.message : "DONKI fetch failed",
    };
  }
}

export async function GET() {
  if (memoryCache && Date.now() - memoryCache.at < TTL_MS) {
    return NextResponse.json(memoryCache.body, {
      headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
    });
  }

  const errors: string[] = [];
  const [cad, donki] = await Promise.all([fetchJplCad(), fetchNasaDonki()]);
  if (cad.error) errors.push(cad.error);
  if (donki.error) errors.push(donki.error);

  const items = [...cad.items, ...donki.items].sort(
    (a, b) => a.startMs - b.startMs
  );

  const body: SkyFeedResponse = {
    fetchedAt: Date.now(),
    sources: {
      jplCad: cad.items.length > 0,
      nasaDonki: donki.items.length > 0,
      errors,
    },
    items,
    catalogActive: getActiveSkyEvents(),
  };

  // Attach a few upcoming catalog for convenience
  void getUpcomingSkyEvents;

  memoryCache = { at: Date.now(), body };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
  });
}

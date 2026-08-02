import type { MissionProfileId } from "./orbital";
import type { SkyEvent, SkyEventKind } from "./sky-events";

/** Live feed item from JPL CAD / NASA DONKI (and static catalog tags). */
export interface LiveFeedItem {
  id: string;
  source: "jpl_cad" | "nasa_donki" | "catalog";
  name: string;
  kind: SkyEventKind | "neo_approach" | "solar_flare" | "cme";
  blurb: string;
  startMs: number;
  endMs: number;
  /** Optional gameplay hooks when near-term */
  rewardMultiplier?: number;
  bonusCredits?: number;
  boostMissions?: MissionProfileId[];
  meta?: Record<string, string | number>;
  url?: string;
}

export interface SkyFeedResponse {
  fetchedAt: number;
  sources: { jplCad: boolean; nasaDonki: boolean; errors: string[] };
  items: LiveFeedItem[];
  /** Catalog events currently active (from static calendar) */
  catalogActive: SkyEvent[];
}

const AU_KM = 149_597_870.7;

/** Convert JPL CAD row to feed item. fields from API field list. */
export function cadRowsToFeedItems(
  fields: string[],
  rows: string[][]
): LiveFeedItem[] {
  const idx = (name: string) => fields.indexOf(name);
  const iDes = idx("des");
  const iCd = idx("cd");
  const iDist = idx("dist");
  const iVrel = idx("v_rel");
  const iH = idx("h");

  return rows
    .map((row, n) => {
      const des = iDes >= 0 ? row[iDes] : `NEO-${n}`;
      const cd = iCd >= 0 ? row[iCd] : "";
      // cd format e.g. "2026-Aug-12 14:22"
      const startMs = parseCadDate(cd) || Date.now();
      const distAu = iDist >= 0 ? parseFloat(row[iDist]) : NaN;
      const distLd =
        Number.isFinite(distAu) ? (distAu * AU_KM) / 384_400 : NaN; // lunar distances
      const vRel = iVrel >= 0 ? parseFloat(row[iVrel]) : NaN;
      const h = iH >= 0 ? parseFloat(row[iH]) : NaN;

      const close =
        Number.isFinite(distAu) && distAu < 0.05
          ? distAu < 0.01
            ? "very close"
            : "notable"
          : "approaching";

      const day = 86400_000;
      const endMs = startMs + day; // single-day window for approach epoch

      // Gameplay: closer approaches → better bonuses for belt / LEO watch
      let rewardMultiplier = 1.15;
      let bonusCredits = 30;
      if (Number.isFinite(distAu) && distAu < 0.02) {
        rewardMultiplier = 1.4;
        bonusCredits = 70;
      }
      if (Number.isFinite(distAu) && distAu < 0.01) {
        rewardMultiplier = 1.65;
        bonusCredits = 110;
      }

      const distStr = Number.isFinite(distAu)
        ? `${distAu.toFixed(4)} AU` +
          (Number.isFinite(distLd) ? ` (~${distLd.toFixed(1)} LD)` : "")
        : "distance n/a";

      return {
        id: `jpl_cad_${des}_${cd}`.replace(/\s+/g, "_"),
        source: "jpl_cad" as const,
        name: `NEO close approach: ${des}`,
        kind: "neo_approach" as const,
        blurb: `JPL SBDB: ${close} approach of ${des} at ${distStr}${
          Number.isFinite(vRel) ? `, v∞≈${vRel.toFixed(1)} km/s` : ""
        }${Number.isFinite(h) ? `, H=${h.toFixed(1)}` : ""}.`,
        startMs: startMs - day, // lead-in day for “active” window
        endMs: endMs + day,
        rewardMultiplier,
        bonusCredits,
        boostMissions: ["asteroid_belt", "leo"] as MissionProfileId[],
        meta: {
          designation: des,
          distAu: Number.isFinite(distAu) ? distAu : -1,
          vRel: Number.isFinite(vRel) ? vRel : -1,
        },
        url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(des)}`,
      };
    })
    .filter((x) => Number.isFinite(x.startMs));
}

function parseCadDate(cd: string): number | null {
  if (!cd) return null;
  // "2026-Aug-12 14:22" or "2026-Aug-12"
  const m = cd.match(
    /^(\d{4})-([A-Za-z]{3})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/
  );
  if (!m) {
    const t = Date.parse(cd);
    return Number.isFinite(t) ? t : null;
  }
  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const mo = months[m[2]];
  if (mo == null) return null;
  const y = parseInt(m[1], 10);
  const d = parseInt(m[3], 10);
  const hh = m[4] ? parseInt(m[4], 10) : 12;
  const mm = m[5] ? parseInt(m[5], 10) : 0;
  return Date.UTC(y, mo, d, hh, mm, 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function donkiFlaresToFeedItems(flares: any[]): LiveFeedItem[] {
  return flares.slice(0, 20).map((f, i) => {
    const begin = f.beginTime || f.peakTime || f.endTime;
    const startMs = begin ? Date.parse(begin) : Date.now();
    const endMs = f.endTime
      ? Date.parse(f.endTime)
      : startMs + 6 * 3600_000;
    const cls = f.classType || f.flrID || "flare";
    const source = f.sourceLocation || f.activeRegionNum || "";
    return {
      id: `donki_flr_${f.flrID || i}_${begin}`,
      source: "nasa_donki" as const,
      name: `Solar flare ${cls}`,
      kind: "solar_flare" as const,
      blurb: `NASA DONKI: ${cls} flare${
        source ? ` near ${source}` : ""
      }. Elevated solar activity window.`,
      startMs: Number.isFinite(startMs) ? startMs : Date.now(),
      endMs: Number.isFinite(endMs) ? endMs : Date.now() + 3600_000,
      rewardMultiplier: String(cls).startsWith("X")
        ? 1.5
        : String(cls).startsWith("M")
          ? 1.3
          : 1.15,
      bonusCredits: String(cls).startsWith("X")
        ? 90
        : String(cls).startsWith("M")
          ? 50
          : 25,
      boostMissions: ["leo", "lunar", "event_storm_rider"] as MissionProfileId[],
      meta: { classType: cls },
      url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function donkiCmesToFeedItems(cmes: any[]): LiveFeedItem[] {
  // DONKI often returns many analyses for the same event; keep the fastest per start hour
  const byHour = new Map<string, LiveFeedItem>();

  for (let i = 0; i < cmes.length; i++) {
    const c = cmes[i];
    const t = c.startTime || String(c.activityID || "").slice(0, 19);
    let startMs = t ? Date.parse(String(t).includes("Z") ? t : `${String(t).slice(0, 19)}Z`) : NaN;
    if (!Number.isFinite(startMs) && c.activityID) {
      // activityID like "2026-08-02T12:00:00-CME-001"
      const m = String(c.activityID).match(
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/
      );
      if (m) startMs = Date.parse(m[1] + "Z");
    }
    if (!Number.isFinite(startMs)) continue;

    const analyses = Array.isArray(c.cmeAnalyses) ? c.cmeAnalyses : [];
    const speed = Math.max(
      0,
      ...analyses.map((a: { speed?: number }) => Number(a.speed) || 0),
      Number(c.speed) || 0
    );
    const hourKey = new Date(startMs).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const existing = byHour.get(hourKey);
    const existingSpeed = Number(existing?.meta?.speed) || 0;
    if (existing && existingSpeed >= speed) continue;

    const mult = speed >= 800 ? 1.4 : speed >= 500 ? 1.3 : 1.2;
    const bonus = speed >= 800 ? 70 : speed >= 500 ? 50 : 35;

    byHour.set(hourKey, {
      id: `donki_cme_${hourKey}_${c.activityID || i}`,
      source: "nasa_donki",
      name: speed >= 500 ? "Fast CME" : "Coronal mass ejection",
      kind: "cme",
      blurb: `NASA DONKI CME${
        speed ? ` · ~${Math.round(speed)} km/s model speed` : ""
      }. Solar wind disturbance possible.`,
      startMs,
      // Short window so the feed isn't flooded for days
      endMs: startMs + 36 * 3600_000,
      rewardMultiplier: mult,
      bonusCredits: bonus,
      boostMissions: ["leo", "event_storm_rider"],
      meta: { speed },
      url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
    });
  }

  return Array.from(byHour.values())
    .sort((a, b) => (Number(b.meta?.speed) || 0) - (Number(a.meta?.speed) || 0))
    .slice(0, 6);
}

function interestScore(item: LiveFeedItem): number {
  let s = (item.rewardMultiplier ?? 1) * 100 + (item.bonusCredits ?? 0);
  if (item.kind === "neo_approach") s += 200;
  if (item.kind === "solar_flare") s += 80;
  if (item.kind === "cme") s += 40;
  return s;
}

/**
 * Dedupe + rank for UI: NEOs first, cap CME spam, max N active-ish items.
 */
export function prepareFeedForDisplay(
  items: LiveFeedItem[],
  now = Date.now()
): { active: LiveFeedItem[]; upcoming: LiveFeedItem[]; summary?: LiveFeedItem } {
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    const key =
      i.kind === "cme"
        ? `cme-${new Date(i.startMs).toISOString().slice(0, 13)}`
        : i.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const activeRaw = unique.filter((i) => now >= i.startMs && now <= i.endMs);
  const cmes = activeRaw.filter((i) => i.kind === "cme");
  const nonCme = activeRaw.filter((i) => i.kind !== "cme");

  // Collapse many active CMEs into one summary + keep the single strongest
  let summary: LiveFeedItem | undefined;
  let topCme: LiveFeedItem[] = [];
  if (cmes.length > 1) {
    const best = [...cmes].sort(
      (a, b) => (Number(b.meta?.speed) || 0) - (Number(a.meta?.speed) || 0)
    )[0];
    topCme = [best];
    const maxSpeed = Math.max(...cmes.map((c) => Number(c.meta?.speed) || 0));
    summary = {
      id: `cme_summary_${new Date(now).toISOString().slice(0, 10)}`,
      source: "nasa_donki",
      name: `Solar wind: ${cmes.length} CMEs in window`,
      kind: "cme",
      blurb: `NASA DONKI reports ${cmes.length} coronal mass ejections recently (fastest ~${Math.round(maxSpeed)} km/s). Grouped so the feed stays readable.`,
      startMs: Math.min(...cmes.map((c) => c.startMs)),
      endMs: Math.max(...cmes.map((c) => c.endMs)),
      rewardMultiplier: best.rewardMultiplier,
      bonusCredits: best.bonusCredits,
      boostMissions: ["leo", "event_storm_rider"],
      url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
    };
  } else {
    topCme = cmes;
  }

  const active = [...nonCme, ...topCme]
    .sort((a, b) => interestScore(b) - interestScore(a))
    .slice(0, 6);

  const upcoming = unique
    .filter((i) => i.startMs > now)
    .sort((a, b) => a.startMs - b.startMs || interestScore(b) - interestScore(a))
    .filter((i) => i.kind !== "cme" || interestScore(i) > 100)
    .slice(0, 6);

  return { active, upcoming, summary };
}

/** Live items that overlap "now" for reward stacking with catalog. */
export function activeLiveItems(
  items: LiveFeedItem[],
  now = Date.now()
): LiveFeedItem[] {
  return prepareFeedForDisplay(items, now).active;
}

export function liveRewardBoost(items: LiveFeedItem[], now = Date.now()): {
  multiplier: number;
  bonusCredits: number;
  labels: string[];
} {
  // Use display-prepared set so 12 CMEs don't stack 12× flat bonuses
  const { active, summary } = prepareFeedForDisplay(items, now);
  const pool = summary ? [...active.filter((a) => a.kind !== "cme"), summary] : active;
  if (pool.length === 0) {
    return { multiplier: 1, bonusCredits: 0, labels: [] };
  }
  return {
    multiplier: Math.max(...pool.map((a) => a.rewardMultiplier ?? 1)),
    // Cap stacked flat bonus so solar storms don't print free money
    bonusCredits: Math.min(
      150,
      pool.reduce((s, a) => s + (a.bonusCredits ?? 0), 0)
    ),
    labels: pool.map((a) => a.name).slice(0, 4),
  };
}

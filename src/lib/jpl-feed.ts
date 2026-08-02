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
  return cmes.slice(0, 12).map((c, i) => {
    const t = c.startTime || c.activityID;
    const startMs = t ? Date.parse(String(t).slice(0, 19) + "Z") : Date.now();
    const speed = c.cmeAnalyses?.[0]?.speed ?? c.speed;
    return {
      id: `donki_cme_${c.activityID || i}`,
      source: "nasa_donki" as const,
      name: "Coronal mass ejection",
      kind: "cme" as const,
      blurb: `NASA DONKI CME${
        speed ? ` · model speed ~${Math.round(speed)} km/s` : ""
      }. Watch for geomagnetic response.`,
      startMs: Number.isFinite(startMs) ? startMs : Date.now(),
      endMs: (Number.isFinite(startMs) ? startMs : Date.now()) + 3 * 86400_000,
      rewardMultiplier: 1.25,
      bonusCredits: 40,
      boostMissions: ["leo", "event_storm_rider"] as MissionProfileId[],
      url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
    };
  });
}

/** Live items that overlap "now" for reward stacking with catalog. */
export function activeLiveItems(
  items: LiveFeedItem[],
  now = Date.now()
): LiveFeedItem[] {
  return items.filter((i) => now >= i.startMs && now <= i.endMs);
}

export function liveRewardBoost(items: LiveFeedItem[], now = Date.now()): {
  multiplier: number;
  bonusCredits: number;
  labels: string[];
} {
  const active = activeLiveItems(items, now);
  if (active.length === 0) {
    return { multiplier: 1, bonusCredits: 0, labels: [] };
  }
  return {
    multiplier: Math.max(...active.map((a) => a.rewardMultiplier ?? 1)),
    bonusCredits: active.reduce((s, a) => s + (a.bonusCredits ?? 0), 0),
    labels: active.map((a) => a.name),
  };
}

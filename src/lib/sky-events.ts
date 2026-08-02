import type { MissionProfileId } from "./orbital";

export type SkyEventKind =
  | "meteor_shower"
  | "planet_opposition"
  | "equinox_solstice"
  | "solar"
  | "comet"
  | "eclipse";

export interface SkyEvent {
  id: string;
  name: string;
  kind: SkyEventKind;
  /** Short science blurb */
  blurb: string;
  /** Inclusive window (local Date interpreted as UTC midnight bounds) */
  startMs: number;
  endMs: number;
  /** Credit multiplier for launches during event (1.0 = normal) */
  rewardMultiplier: number;
  /** Bonus credits flat on launch during event */
  bonusCredits: number;
  /** Highlighted mission profiles */
  boostMissions: MissionProfileId[];
  /** Optional limited cosmetic unlockable in shop */
  featuredSkinId?: string;
  /** Extra mission unlocked only while active */
  eventMissionId?: MissionProfileId;
}

function utc(y: number, m: number, d: number, h = 0): number {
  return Date.UTC(y, m - 1, d, h, 0, 0);
}

/** Recurring + dated sky events (science-inspired, play-tuned windows). */
export function getSkyEventsCatalog(now = Date.now()): SkyEvent[] {
  const year = new Date(now).getUTCFullYear();
  const events: SkyEvent[] = [];

  // Meteor showers (annual)
  for (const y of [year - 1, year, year + 1]) {
    events.push(
      {
        id: "perseids",
        name: "Perseid Meteor Shower",
        kind: "meteor_shower",
        blurb:
          "Debris from comet Swift–Tuttle peaks mid-August. Great night-sky spectacle.",
        startMs: utc(y, 8, 10),
        endMs: utc(y, 8, 15, 23),
        rewardMultiplier: 1.5,
        bonusCredits: 80,
        boostMissions: ["leo", "lunar"],
        featuredSkinId: "perseid_streak",
        eventMissionId: "event_meteor_watch",
      },
      {
        id: "geminids",
        name: "Geminid Meteor Shower",
        kind: "meteor_shower",
        blurb: "One of the strongest annual showers — often 100+ meteors/hour.",
        startMs: utc(y, 12, 12),
        endMs: utc(y, 12, 15, 23),
        rewardMultiplier: 1.45,
        bonusCredits: 70,
        boostMissions: ["leo"],
        eventMissionId: "event_meteor_watch",
      },
      {
        id: "quadrantids",
        name: "Quadrantid Meteors",
        kind: "meteor_shower",
        blurb: "Sharp January peak — brief but intense.",
        startMs: utc(y, 1, 2),
        endMs: utc(y, 1, 5, 23),
        rewardMultiplier: 1.35,
        bonusCredits: 60,
        boostMissions: ["leo"],
      },
      {
        id: "march_equinox",
        name: "March Equinox",
        kind: "equinox_solstice",
        blurb: "Sun crosses the celestial equator — equal day and night.",
        startMs: utc(y, 3, 19),
        endMs: utc(y, 3, 22, 23),
        rewardMultiplier: 1.25,
        bonusCredits: 40,
        boostMissions: ["leo", "lunar", "mars_transfer"],
      },
      {
        id: "sept_equinox",
        name: "September Equinox",
        kind: "equinox_solstice",
        blurb: "Northern autumn / southern spring begins.",
        startMs: utc(y, 9, 21),
        endMs: utc(y, 9, 24, 23),
        rewardMultiplier: 1.25,
        bonusCredits: 40,
        boostMissions: ["leo", "lunar"],
      },
      {
        id: "june_solstice",
        name: "June Solstice",
        kind: "equinox_solstice",
        blurb: "Longest day in the north — deep-space tracking season.",
        startMs: utc(y, 6, 20),
        endMs: utc(y, 6, 22, 23),
        rewardMultiplier: 1.2,
        bonusCredits: 35,
        boostMissions: ["mars_transfer", "asteroid_belt"],
      },
      {
        id: "dec_solstice",
        name: "December Solstice",
        kind: "equinox_solstice",
        blurb: "Longest night in the north — perfect for sky watching.",
        startMs: utc(y, 12, 20),
        endMs: utc(y, 12, 23, 23),
        rewardMultiplier: 1.2,
        bonusCredits: 35,
        boostMissions: ["leo", "lunar"],
      }
    );
  }

  // Dated / multi-year science hooks (approx windows)
  events.push(
    {
      id: "mars_opposition",
      name: "Mars Close Approach Season",
      kind: "planet_opposition",
      blurb:
        "Mars oppositions bring the Red Planet nearest Earth — ideal transfer windows in-game.",
      // Broad playable window covering 2025 opposition aftermath + next cycle interest
      startMs: utc(2025, 1, 1),
      endMs: utc(2025, 3, 15, 23),
      rewardMultiplier: 1.75,
      bonusCredits: 120,
      boostMissions: ["mars_transfer"],
      featuredSkinId: "oppos_mars",
      eventMissionId: "event_mars_rush",
    },
    {
      id: "mars_opposition_2027",
      name: "Mars Opposition 2027",
      kind: "planet_opposition",
      blurb: "Next major Mars opposition window — transfer bonus active.",
      startMs: utc(2027, 1, 20),
      endMs: utc(2027, 3, 10, 23),
      rewardMultiplier: 1.8,
      bonusCredits: 140,
      boostMissions: ["mars_transfer"],
      featuredSkinId: "oppos_mars",
      eventMissionId: "event_mars_rush",
    },
    {
      id: "solar_max",
      name: "Solar Maximum Watch",
      kind: "solar",
      blurb:
        "Solar Cycle 25 peak years bring more flares & auroras. Storm-hardened missions pay more.",
      startMs: utc(2024, 6, 1),
      endMs: utc(2026, 12, 31, 23),
      rewardMultiplier: 1.3,
      bonusCredits: 50,
      boostMissions: ["leo", "lunar", "asteroid_belt"],
      featuredSkinId: "solar_storm",
      eventMissionId: "event_storm_rider",
    },
    {
      id: "total_solar_eclipse_2026",
      name: "Total Solar Eclipse 2026",
      kind: "eclipse",
      blurb: "Path of totality across parts of Europe & Iceland (12 Aug 2026).",
      startMs: utc(2026, 8, 10),
      endMs: utc(2026, 8, 13, 23),
      rewardMultiplier: 2.0,
      bonusCredits: 150,
      boostMissions: ["leo", "lunar"],
      eventMissionId: "event_eclipse_chase",
    },
    {
      id: "total_solar_eclipse_2027",
      name: "Total Solar Eclipse 2027",
      kind: "eclipse",
      blurb: "Long totality over North Africa & Middle East (2 Aug 2027).",
      startMs: utc(2027, 7, 31),
      endMs: utc(2027, 8, 3, 23),
      rewardMultiplier: 2.0,
      bonusCredits: 150,
      boostMissions: ["leo", "lunar"],
      eventMissionId: "event_eclipse_chase",
    },
    {
      id: "perseids_2026_grand",
      name: "Perseids + Eclipse Season",
      kind: "meteor_shower",
      blurb:
        "August 2026 stacks Perseids near eclipse season — double reason to look up.",
      startMs: utc(2026, 8, 8),
      endMs: utc(2026, 8, 16, 23),
      rewardMultiplier: 1.65,
      bonusCredits: 100,
      boostMissions: ["leo", "lunar"],
      featuredSkinId: "perseid_streak",
      eventMissionId: "event_meteor_watch",
    }
  );

  // Deduplicate by id+year window: keep unique id per overlapping - actually multiple perseids with same id is ok if we filter active by date
  // Fix: annual events share id "perseids" - getActiveEvents filters by date so only current year window matches
  return events;
}

export function getActiveSkyEvents(now = Date.now()): SkyEvent[] {
  return getSkyEventsCatalog(now).filter(
    (e) => now >= e.startMs && now <= e.endMs
  );
}

export function getUpcomingSkyEvents(now = Date.now(), limit = 5): SkyEvent[] {
  return getSkyEventsCatalog(now)
    .filter((e) => e.endMs >= now)
    .sort((a, b) => a.startMs - b.startMs)
    .filter((e, i, arr) => {
      // unique by id keeping soonest
      return arr.findIndex((x) => x.id === e.id) === i;
    })
    .slice(0, limit);
}

export function bestRewardMultiplier(now = Date.now()): number {
  const active = getActiveSkyEvents(now);
  if (active.length === 0) return 1;
  return Math.max(...active.map((e) => e.rewardMultiplier));
}

export function totalEventBonusCredits(now = Date.now()): number {
  return getActiveSkyEvents(now).reduce((s, e) => s + e.bonusCredits, 0);
}

export function isMissionBoosted(
  missionId: MissionProfileId,
  now = Date.now()
): SkyEvent | undefined {
  return getActiveSkyEvents(now).find((e) =>
    e.boostMissions.includes(missionId)
  );
}

export function formatEventWindow(e: SkyEvent): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const a = new Date(e.startMs).toLocaleDateString(undefined, opts);
  const b = new Date(e.endMs).toLocaleDateString(undefined, opts);
  return `${a} – ${b}`;
}

export function eventKindLabel(kind: SkyEventKind): string {
  switch (kind) {
    case "meteor_shower":
      return "Meteor shower";
    case "planet_opposition":
      return "Planetary";
    case "equinox_solstice":
      return "Season";
    case "solar":
      return "Solar";
    case "comet":
      return "Comet";
    case "eclipse":
      return "Eclipse";
  }
}

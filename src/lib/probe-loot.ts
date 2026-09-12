/**
 * What probes bring back — science, junk, and cursed discoveries.
 */

export type LootRarity = "common" | "uncommon" | "rare" | "cursed";

export type LootId =
  | "noise_sample"
  | "pretty_earthrise"
  | "dust_smudge"
  | "boring_spectrum"
  | "suspicious_reading"
  | "cold_spot"
  | "radio_whisper"
  | "bent_antenna_tip"
  | "unscheduled_emotion"
  | "venus_fanfic"
  | "map_that_lies"
  | "friend_shaped_void"
  | "lucky_bolt"
  | "storm_souvenir"
  | "first_light"
  | "friend_shaped_photo"
  | "moon_rock"
  | "unknown_debris"
  | "wrong_earth"
  | "future_timestamp"
  | "unknown_object";

export interface LootDef {
  id: LootId;
  name: string;
  blurb: string;
  rarity: LootRarity;
  /** Credits when catalogued */
  creditValue: number;
}

export const LOOT_CATALOG: LootDef[] = [
  {
    id: "noise_sample",
    name: "Background noise sample",
    blurb: "Technically science. Emotionally beige.",
    rarity: "common",
    creditValue: 15,
  },
  {
    id: "pretty_earthrise",
    name: "Pretty Earthrise",
    blurb: "Not required. Still kept.",
    rarity: "common",
    creditValue: 25,
  },
  {
    id: "dust_smudge",
    name: "Hull dust smudge",
    blurb: "Probably micrometeorite. Possibly snack.",
    rarity: "common",
    creditValue: 10,
  },
  {
    id: "boring_spectrum",
    name: "Extremely normal spectrum",
    blurb: "The universe, being consistent for once.",
    rarity: "common",
    creditValue: 20,
  },
  {
    id: "suspicious_reading",
    name: "Suspicious reading",
    blurb: "Instrument error… or plot hook. File both ways.",
    rarity: "uncommon",
    creditValue: 55,
  },
  {
    id: "cold_spot",
    name: "Cold spot log",
    blurb: "A temperature that felt personal.",
    rarity: "uncommon",
    creditValue: 50,
  },
  {
    id: "radio_whisper",
    name: "Radio whisper",
    blurb: "Static that almost had grammar.",
    rarity: "uncommon",
    creditValue: 60,
  },
  {
    id: "bent_antenna_tip",
    name: "Bent antenna tip",
    blurb: "Battle scar. Or parking incident. Same energy.",
    rarity: "uncommon",
    creditValue: 40,
  },
  {
    id: "unscheduled_emotion",
    name: "Unscheduled emotion",
    blurb: "The probe has feelings now. HR has questions.",
    rarity: "rare",
    creditValue: 120,
  },
  {
    id: "venus_fanfic",
    name: "Unauthorized Venus essay",
    blurb: "2,000 words. No one asked. Peer review pending.",
    rarity: "rare",
    creditValue: 100,
  },
  {
    id: "map_that_lies",
    name: "Map that lies a little",
    blurb: "Coordinates almost right. Vibes impeccable.",
    rarity: "rare",
    creditValue: 110,
  },
  {
    id: "friend_shaped_void",
    name: "Friend-shaped void",
    blurb: "Nothing is there. It feels familiar.",
    rarity: "cursed",
    creditValue: 180,
  },
  {
    id: "lucky_bolt",
    name: "Lucky bolt",
    blurb: "Should have fallen off. Didn’t. Keep it.",
    rarity: "rare",
    creditValue: 90,
  },
  {
    id: "storm_souvenir",
    name: "Storm souvenir",
    blurb: "Charged particle tan. Looks great on camera.",
    rarity: "uncommon",
    creditValue: 70,
  },
  {
    id: "first_light",
    name: "First light plate",
    blurb: "The first useful photo. Frame it. Or don’t. (Frame it.)",
    rarity: "uncommon",
    creditValue: 80,
  },
  {
    id: "friend_shaped_photo",
    name: "Friend-shaped void photograph",
    blurb: "The empty part of the image appears to be posing.",
    rarity: "rare",
    creditValue: 95,
  },
  {
    id: "moon_rock",
    name: "Moon rock",
    blurb: "A lunar sample that has already requested its own chair.",
    rarity: "common",
    creditValue: 22,
  },
  {
    id: "unknown_debris",
    name: "Unknown debris",
    blurb: "Not one connector matches CosmoForge standards. A high bar, somehow.",
    rarity: "rare",
    creditValue: 95,
  },
  {
    id: "wrong_earth",
    name: "Wrong Earth",
    blurb: "Earth, except the Moon is duplicated and the daylight comes from nowhere useful.",
    rarity: "cursed",
    creditValue: 175,
  },
  {
    id: "future_timestamp",
    name: "Future timestamp",
    blurb: "The recorder insists tomorrow happened first.",
    rarity: "cursed",
    creditValue: 165,
  },
  {
    id: "unknown_object",
    name: "Unknown object 01",
    blurb: "No obvious purpose. No matching age. One part keeps turning toward the door.",
    rarity: "cursed",
    creditValue: 200,
  },
];

export function getLoot(id: LootId): LootDef {
  return LOOT_CATALOG.find((l) => l.id === id) ?? LOOT_CATALOG[0];
}

const COLLECTION_KEY = "cosmoforge-collection-v1";

export interface PlayerCollection {
  version: 1;
  /** lootId -> times catalogued */
  found: Record<string, number>;
  totalCreditsFromLoot: number;
  /** debrief keys already paid out (craftId) */
  claimedDebriefs?: string[];
}

function emptyCollection(): PlayerCollection {
  return { version: 1, found: {}, totalCreditsFromLoot: 0, claimedDebriefs: [] };
}

export function loadCollection(): PlayerCollection {
  if (typeof window === "undefined") return emptyCollection();
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw) return emptyCollection();
    const p = JSON.parse(raw) as PlayerCollection;
    if (p?.version !== 1) return emptyCollection();
    if (!p.claimedDebriefs) p.claimedDebriefs = [];
    return p;
  } catch {
    return emptyCollection();
  }
}

export function saveCollection(c: PlayerCollection): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(c));
}

export function catalogueLoot(lootIds: LootId[]): {
  collection: PlayerCollection;
  credits: number;
  newFinds: LootId[];
} {
  const collection = loadCollection();
  let credits = 0;
  const newFinds: LootId[] = [];
  for (const id of lootIds) {
    const def = getLoot(id);
    const prev = collection.found[id] ?? 0;
    if (prev === 0) newFinds.push(id);
    collection.found[id] = prev + 1;
    credits += def.creditValue;
  }
  collection.totalCreditsFromLoot += credits;
  saveCollection(collection);
  return { collection, credits, newFinds };
}

/** Pay out a debrief once (re-reading won’t double credits) */
export function catalogueDebriefOnce(
  debriefKey: string,
  lootIds: LootId[]
): {
  collection: PlayerCollection;
  credits: number;
  newFinds: LootId[];
  alreadyClaimed: boolean;
} {
  const collection = loadCollection();
  const claimed = collection.claimedDebriefs ?? [];
  if (claimed.includes(debriefKey)) {
    return {
      collection,
      credits: 0,
      newFinds: [],
      alreadyClaimed: true,
    };
  }
  const result = catalogueLoot(lootIds);
  result.collection.claimedDebriefs = [
    ...(result.collection.claimedDebriefs ?? []),
    debriefKey,
  ];
  saveCollection(result.collection);
  return { ...result, alreadyClaimed: false };
}

export function collectionStats(c = loadCollection()) {
  const total = LOOT_CATALOG.length;
  const found = Object.keys(c.found).filter((k) => (c.found[k] ?? 0) > 0)
    .length;
  return { found, total, pct: Math.round((found / total) * 100) };
}

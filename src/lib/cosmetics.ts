export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";

export interface SkinDef {
  id: string;
  name: string;
  description: string;
  /** Marker / accent color */
  color: string;
  secondary?: string;
  rarity: CosmeticRarity;
  priceCredits: number;
  /** Free starter */
  free?: boolean;
  /** Only available during this sky event id */
  eventId?: string;
}

export const SKINS: SkinDef[] = [
  {
    id: "default",
    name: "Forge Cyan",
    description: "Standard CosmoForge beacon.",
    color: "#22d3ee",
    rarity: "common",
    priceCredits: 0,
    free: true,
  },
  {
    id: "ember",
    name: "Re-entry Ember",
    description: "Warm plasma edge for atmospheric drama.",
    color: "#f97316",
    secondary: "#fbbf24",
    rarity: "common",
    priceCredits: 120,
  },
  {
    id: "aurora",
    name: "Polar Aurora",
    description: "Green-violet shimmer — polar night energy.",
    color: "#34d399",
    secondary: "#a78bfa",
    rarity: "rare",
    priceCredits: 280,
  },
  {
    id: "void_gold",
    name: "Void Gold",
    description: "Deep-space prestige livery.",
    color: "#fbbf24",
    secondary: "#78350f",
    rarity: "epic",
    priceCredits: 450,
  },
  {
    id: "ion_lilac",
    name: "Ion Lilac",
    description: "Soft purple for electric propulsion fans.",
    color: "#c084fc",
    rarity: "rare",
    priceCredits: 260,
  },
  {
    id: "perseid_streak",
    name: "Perseid Streak",
    description: "Meteor-shower limited livery.",
    color: "#f472b6",
    secondary: "#67e8f9",
    rarity: "legendary",
    priceCredits: 600,
    eventId: "perseids",
  },
  {
    id: "solar_storm",
    name: "Solar Storm",
    description: "Coronal mass ejection energy.",
    color: "#ef4444",
    secondary: "#fde047",
    rarity: "epic",
    priceCredits: 400,
    eventId: "solar_max",
  },
  {
    id: "oppos_mars",
    name: "Opposition Crimson",
    description: "When Mars is closest — dress the part.",
    color: "#dc2626",
    secondary: "#fb923c",
    rarity: "legendary",
    priceCredits: 550,
    eventId: "mars_opposition",
  },
];

export function getSkin(id: string | undefined): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function rarityColor(r: CosmeticRarity): string {
  switch (r) {
    case "common":
      return "text-slate-300";
    case "rare":
      return "text-sky-300";
    case "epic":
      return "text-violet-300";
    case "legendary":
      return "text-amber-300";
  }
}

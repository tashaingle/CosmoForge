import type { MissionProfileId } from "../../lib/orbital";
import type { LootId } from "../../lib/probe-loot";
import type { PersonalityId, ScarId } from "../../lib/probe-personality";

export type EncounterRarity = "common" | "uncommon" | "rare" | "strange" | "cursed";
export type EncounterType = "flavour" | "simple_choice" | "risk_choice" | "delayed" | "multi_part";
export type EncounterLocation = "earth" | "moon" | "mars" | "venus" | "asteroid_belt" | "deep_space" | "solar_event";
export type EncounterRepeat = "repeatable" | "once_per_probe" | "once_per_save";
export type EncounterText = Partial<Record<PersonalityId, string>> & { default: string };

export type MemoryRequirement = {
  key: string;
  equals?: string | number | boolean;
  min?: number;
  absent?: boolean;
};

export type EncounterConsequence = {
  relationship?: number;
  relationshipByPersonality?: Partial<Record<PersonalityId, number>>;
  lootId?: LootId;
  scarId?: ScarId;
  memory?: Record<string, string | number | boolean>;
  incrementMemory?: Record<string, number>;
  storyFlags?: string[];
};

export type EncounterFollowUp = {
  id: string;
  afterProgress: number;
  message: EncounterText;
  requiresChoice?: string;
  memoryRequirements?: MemoryRequirement[];
  consequence?: EncounterConsequence;
};

export type EncounterChoice = {
  id: string;
  label: string;
  response: EncounterText;
  consequence?: EncounterConsequence;
  delayed?: EncounterFollowUp;
};

export type EncounterDefinition = {
  id: string;
  title: string;
  rarity: EncounterRarity;
  type: EncounterType;
  message: EncounterText;
  weight?: number;
  validMissions?: MissionProfileId[];
  validLocations?: EncounterLocation[];
  minVoyages?: number;
  memoryRequirements?: MemoryRequirement[];
  memoryVariants?: Array<{
    memoryRequirements?: MemoryRequirement[];
    minRelationship?: number;
    message: EncounterText;
  }>;
  repeat: EncounterRepeat;
  cooldownVoyages?: number;
  maxOccurrences?: number;
  onTrigger?: EncounterConsequence;
  choices?: EncounterChoice[];
  followUps?: EncounterFollowUp[];
  onboardingOnly?: boolean;
  /** Used only by the protected first-flight encounter. */
  triggerProgress?: number;
};

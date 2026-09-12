import type { Craft, ProbePing } from "@/lib/types";
import type { LootId } from "@/lib/probe-loot";
import type { PersonalityId, ScarId } from "@/lib/probe-personality";
import { incrementMemory } from "./probe-memory";

export type EncounterChoiceId = "investigate" | "leave" | "photo";

export type EncounterChoice = {
  id: EncounterChoiceId;
  label: string;
  relationshipByPersonality: Partial<Record<PersonalityId, number>>;
  defaultRelationship: number;
  lootId?: LootId;
  scarId?: ScarId;
  response: Partial<Record<PersonalityId, string>> & { default: string };
  memory: Record<string, string | number | boolean>;
};

export type EncounterDefinition = {
  id: string;
  title: string;
  triggerProgress: number;
  message: Partial<Record<PersonalityId, string>> & { default: string };
  choices: EncounterChoice[];
};

export const ENCOUNTERS: EncounterDefinition[] = [
  {
    id: "first_matching_signal",
    title: "UNREGISTERED COMPANION SIGNAL",
    triggerProgress: 0.32,
    message: {
      default: "There is something outside. It has been matching my speed for four minutes. I would like to formally request that it stop.",
      anxious: "There is something outside. It is matching my speed. I have checked twice and would now like to be wrong.",
      dramatic: "Something follows in my wake. Silent. Patient. Finally, space has developed a plot.",
      chaotic: "Good news: I made a friend. Bad news: it has no identifiable shape and is matching my speed.",
    },
    choices: [
      {
        id: "investigate", label: "Investigate", defaultRelationship: 2,
        relationshipByPersonality: { dramatic: 3, chaotic: 3, anxious: 1 },
        lootId: "suspicious_reading", scarId: "rattles",
        response: { default: "Approaching. This sentence may age badly.", anxious: "I knew you were going to say that.", dramatic: "At last. A worthy mystery.", chaotic: "Already on my way." },
        memory: { first_encounter_choice: "investigate" },
      },
      {
        id: "leave", label: "Absolutely not", defaultRelationship: 0,
        relationshipByPersonality: { anxious: 2, dramatic: -1, chaotic: -1 },
        response: { default: "Retreating. I agreed before you finished typing.", anxious: "Retreating. I would like it noted that I agreed immediately.", dramatic: "A tactical withdrawal. Less poetic, more survivable.", chaotic: "Fine. But I am looking at it in the mirrors." },
        memory: { first_encounter_choice: "leave", times_player_chose_safe_option: 1 },
      },
      {
        id: "photo", label: "Take a photo", defaultRelationship: 1,
        relationshipByPersonality: { anxious: 1, dramatic: 2, chaotic: 2 },
        lootId: "friend_shaped_photo",
        response: { default: "Photo acquired. It somehow looks worse in the picture.", anxious: "Photo acquired from a safe-ish distance. It looks closer now.", dramatic: "Captured. Its absence has excellent lighting.", chaotic: "Got it. The camera now says there were two of them." },
        memory: { first_encounter_choice: "photo", first_strange_photo: true, strange_photos: 1 },
      },
    ],
  },
];

export function getEncounter(id: string): EncounterDefinition | undefined {
  return ENCOUNTERS.find((encounter) => encounter.id === id);
}

export function encounterMessage(encounter: EncounterDefinition, personality: PersonalityId): string {
  return encounter.message[personality] ?? encounter.message.default;
}

export function applyEncounterChoice(craft: Craft, pingId: string, encounterId: string, choiceId: EncounterChoiceId): Craft | null {
  const encounter = getEncounter(encounterId);
  const choice = encounter?.choices.find((item) => item.id === choiceId);
  if (!encounter || !choice) return null;
  const personality = craft.personalityId ?? "chipper";
  const response = choice.response[personality] ?? choice.response.default;
  const pings: ProbePing[] = (craft.pings ?? []).map((ping) => ping.id === pingId ? { ...ping, resolvedChoiceId: choice.id, resolutionText: response } : ping);
  const cargo = new Set(craft.cargoLootIds ?? []);
  const scars = new Set(craft.scarIds ?? []);
  if (choice.lootId) cargo.add(choice.lootId);
  if (choice.scarId) scars.add(choice.scarId);
  let memory = incrementMemory(craft.memory, "void_encounters");
  for (const [key, value] of Object.entries(choice.memory)) memory = { ...memory, [key]: value };
  return {
    ...craft,
    pings,
    cargoLootIds: [...cargo],
    scarIds: [...scars],
    relationship: (craft.relationship ?? 0) + (choice.relationshipByPersonality[personality] ?? choice.defaultRelationship),
    memory,
  };
}

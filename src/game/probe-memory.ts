import type { Craft, ProbeMemory } from "@/lib/types";

export function setMemory(craft: Craft, key: string, value: string | number | boolean): Craft {
  return { ...craft, memory: { ...(craft.memory ?? {}), [key]: value } };
}

export function incrementMemory(memory: ProbeMemory | undefined, key: string, amount = 1): ProbeMemory {
  return { ...(memory ?? {}), [key]: Number(memory?.[key] ?? 0) + amount };
}

export function firstEncounterMemoryLine(craft: Craft): string | undefined {
  switch (craft.memory?.first_encounter_choice) {
    case "investigate": return `You told ${craft.name} to investigate the signal. ${craft.name} has filed this under “things we apparently do now.”`;
    case "leave": return `You told ${craft.name} to leave the signal alone. Curiosity remains present and professionally annoyed.`;
    case "photo": return `You told ${craft.name} to take the photograph. It has not become less unsettling with context.`;
    default: return undefined;
  }
}

export function memoryFlavour(craft: Craft): string | null {
  const photos = Number(craft.memory?.strange_photos ?? 0);
  if (photos >= 3) return `${photos} strange photographs. None have improved with context.`;
  if (craft.memory?.first_encounter_choice === "investigate") return "This isn't going to be another investigation situation, is it?";
  if (craft.memory?.first_encounter_choice === "leave") return "You told me to leave the last one alone. I remain curious.";
  return null;
}

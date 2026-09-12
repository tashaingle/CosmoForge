export { ENCOUNTERS, NORMAL_ENCOUNTERS, ONBOARDING_ENCOUNTER, getEncounter } from "./catalog";
export {
  advanceNormalEncounters,
  applyEncounterConsequence,
  clearProbeEncounterHistory,
  clearSaveEncounterHistory,
  encounterLocation,
  encounterText,
  forceEncounter,
  forceEncounterByRarity,
  isEncounterEligible,
  openingText,
  plannedEncounterCount,
  resolveEncounterChoice,
  selectEncounter,
} from "./engine";
export type {
  EncounterChoice,
  EncounterConsequence,
  EncounterDefinition,
  EncounterLocation,
  EncounterRarity,
  EncounterRepeat,
  EncounterText,
  EncounterType,
  MemoryRequirement,
} from "./types";

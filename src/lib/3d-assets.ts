import type { LootId } from "./probe-loot";
import type { ScarId } from "./probe-personality";

export const MODEL_PATHS = {
  probe: "/models/cosmoforge_probe.glb",
  hangar: "/models/cosmoforge_hangar3.glb",
  damage: "/models/cosmoforge_damage_repair_kit.glb",
  space: "/models/cosmoforge_space_environment_pack.glb",
} as const;

export type MissionEnvironment = "earth" | "moon" | "mars" | "venus" | "asteroids" | "deep-space" | "cursed";

export function getMissionEnvironment(missionId?: string): MissionEnvironment {
  const id = missionId?.toLowerCase() ?? "";
  if (id.includes("venus")) return "venus";
  if (id.includes("mars")) return "mars";
  if (id.includes("lunar") || id.includes("moon")) return "moon";
  if (id.includes("asteroid") || id.includes("belt")) return "asteroids";
  if (id.includes("deep") || id.includes("outer")) return "deep-space";
  if (id.includes("unknown") || id.includes("cursed")) return "cursed";
  return "earth";
}

export const SCAR_3D_OBJECTS: Partial<Record<ScarId, string[]>> = {
  limps: ["Damage_BentPanel_R"],
  afraid_of_dark: ["Damage_BentAntenna"],
  venus_obsessed: ["Veteran_MissionSticker_03"],
  rattles: ["Damage_LooseWire_A"],
  overshares: ["Veteran_WarningSticker"],
  lucky: ["Veteran_LuckyBolt"],
  scorched: ["Damage_ScorchedPanel_R", "Damage_HeatStain"],
  quiet_now: ["Damage_CrackedLens"],
};

export const LOOT_3D_MODELS: Partial<Record<LootId, string>> = {
  noise_sample: "Find_RadioWhisper",
  pretty_earthrise: "Find_ExtraStarPhoto",
  dust_smudge: "Find_MarsDust",
  boring_spectrum: "Find_OldCircuit",
  suspicious_reading: "Find_ImpossibleCube",
  cold_spot: "Find_SolarSample",
  radio_whisper: "Find_RadioWhisper",
  bent_antenna_tip: "Find_SatelliteFragment",
  unscheduled_emotion: "Find_UnscheduledEmotion",
  venus_fanfic: "Find_MapThatLies",
  map_that_lies: "Find_MapThatLies",
  friend_shaped_void: "Find_FriendShapedVoid",
  lucky_bolt: "Find_LuckyBolt",
  storm_souvenir: "Find_MeteorFragment",
  first_light: "Find_ExtraStarPhoto",
  friend_shaped_photo: "Find_ExtraStarPhoto",
};

export function findModelPath(lootId: LootId) {
  const objectName = LOOT_3D_MODELS[lootId];
  return objectName ? `/models/finds/${objectName}.glb` : null;
}

export const PROBE_DEFAULT_MODULES = [
  "SolarPanel_Small_L", "SolarPanel_Small_R", "Antenna_Whip",
  "Camera_Main", "Thruster_Dual", "CargoPod_Small", "BatteryPack",
] as const;

export const PROBE_ALTERNATE_MODULES = [
  "SolarPanel_Large_L", "SolarPanel_Large_R", "Antenna_Dish", "Antenna_Dual",
  "Camera_Wide", "Sensor_Array", "Thruster_Small", "IonDrive",
  "CargoPod_Large", "ScienceModule", "CommunicationsBox",
] as const;


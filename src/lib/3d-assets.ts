import type { LootId, LootRarity } from "./probe-loot";
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

export const LOOT_3D_MODELS: Record<LootId, string> = {
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
  moon_rock: "Find_MoonRock",
  unknown_debris: "Find_UnknownDebris",
  wrong_earth: "Find_WrongEarth",
  future_timestamp: "Find_FutureTimestamp",
  unknown_object: "Find_UnknownObject_01",
};

export function findModelPath(lootId: LootId) {
  const objectName = LOOT_3D_MODELS[lootId];
  return objectName ? `/models/finds/${objectName}.glb` : null;
}

export type FindPresentation = "cargo" | "archive";

/** Blender shipped Common / Rare / Strange / Cursed cases. Uncommon uses the amber Rare case. */
export const CARGO_CASE_BY_RARITY: Record<LootRarity, string> = {
  common: "CargoCase_Common",
  uncommon: "CargoCase_Rare",
  rare: "CargoCase_Strange",
  cursed: "CargoCase_Cursed",
};

export const CARGO_CASE_LIDS = [
  "CargoCase_Common_Lid",
  "CargoCase_Rare_Lid",
  "CargoCase_Strange_Lid",
  "CargoCase_Cursed_Lid",
] as const;

export function cargoCasePath(rarity: LootRarity) {
  return `/models/finds/${CARGO_CASE_BY_RARITY[rarity]}.glb`;
}

export function cargoCaseLidName(rarity: LootRarity) {
  return `${CARGO_CASE_BY_RARITY[rarity]}_Lid`;
}

export const ARCHIVE_DISPLAY_MODEL = "Archive_DisplayStand";
export const ARCHIVE_DISPLAY_MOUNT = "Archive_DisplayStand_Mount";
export const ARCHIVE_DISPLAY_PATH = `/models/finds/${ARCHIVE_DISPLAY_MODEL}.glb`;

export const FIND_HOOK_SIGNAL_LIGHT = "Find_RadioWhisper_SignalLight";
export const FIND_HOOK_EMOTION = "Find_UnscheduledEmotion_Contents";
export const FIND_HOOK_MOVING_LIGHT = "Find_UnknownObject_01_MovingLight";
export const FIND_HOOK_TIMESTAMP_DISPLAY = "Find_FutureTimestamp_Display";
export const FIND_HOOK_TIMESTAMP_TEXT = "Find_FutureTimestamp_Text";

export const PROBE_DEFAULT_MODULES = [
  "SolarPanel_Small_L", "SolarPanel_Small_R", "Antenna_Whip",
  "Camera_Main", "Thruster_Dual", "CargoPod_Small", "BatteryPack",
] as const;

export const PROBE_ALTERNATE_MODULES = [
  "SolarPanel_Large_L", "SolarPanel_Large_R", "Antenna_Dish", "Antenna_Dual",
  "Camera_Wide", "Sensor_Array", "Thruster_Small", "IonDrive",
  "CargoPod_Large", "ScienceModule", "CommunicationsBox",
] as const;

/** Simplified damage/personality meshes baked into the probe GLB. Hide these; scars come from the damage kit. */
export const PROBE_ALWAYS_HIDDEN = [
  "Damage_BentAntenna", "Damage_CrackedLens", "Damage_DentedBody",
  "Damage_LooseWire", "Damage_ScorchedPanel", "Damage_TapedRepair",
  "Personality_ANXIOUS_CompactShell", "Personality_CHAOTIC_ImprovisedPod",
  "Personality_DRAMATIC_OversizedDish",
] as const;

export const PROBE_VOYAGE_WEAR = [
  { minVoyages: 4, node: "Veteran_MissionSticker_01" },
  { minVoyages: 8, node: "Repair_PatchPlate_Small" },
  { minVoyages: 12, node: "Repair_WeldedSeam" },
] as const;

export const HANGAR_DOOR_NODES = ["HangarDoor_Left", "HangarDoor_Right"] as const;
export const HANGAR_CLAMP_NODES = ["Dock_Clamp_L", "Dock_Clamp_R"] as const;
export const HANGAR_STRUCTURE_NODES = ["Dock_Base", "LaunchRail_Carriage", "RepairArm", "InspectionLight"] as const;
export const HANGAR_LOW_QUALITY_HIDE = /Coffee|Toolbox|Spare|Crate|Tablet|Cart|Mug/;

export const SPACE_ENVIRONMENT_ROOTS: Record<MissionEnvironment, string> = {
  earth: "Planet_Earth",
  moon: "Planet_Moon",
  mars: "Planet_Mars",
  venus: "Planet_Venus",
  asteroids: "AsteroidField_Demo",
  "deep-space": "Space_DistantDust",
  cursed: "Space_CursedDistortion",
};

export const SPACE_TOGGLE_NODES = [
  "Planet_Earth", "Planet_Moon", "Moon_CraterForeground", "Planet_Mars",
  "Mars_Rock_A", "Mars_Rock_B", "Mars_Ridge", "Mars_DustCloud", "Planet_Venus",
  "Star_Sun", "Asteroid_A", "Asteroid_B", "Asteroid_C", "Asteroid_D", "Asteroid_E",
  "Asteroid_Fragment_Small", "AsteroidField_Demo", "CF_Starfield", "Space_Nebula_Volume",
  "Space_DistantDust", "Space_UnknownGlow", "Space_CursedDistortion", "Space_ImpossibleStar",
  "Orbit_Path", "Mission_TargetMarker", "Signal_Ping", "Navigation_Beacon", "Unknown_SignalMarker",
] as const;

export const SPACE_ROTATING_LAYERS = ["Earth_Clouds", "Venus_CloudLayer_01", "Venus_CloudLayer_02"] as const;
export const SPACE_LOW_QUALITY_HIDE = ["Earth_Atmosphere", "Venus_Atmosphere", "Mars_DustCloud", "Space_Nebula_Volume", "Space_DistantDust"] as const;


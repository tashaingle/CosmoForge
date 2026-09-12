"""Headless validation for the generated CosmoForge damage/repair exports."""

from pathlib import Path
import bpy


ROOT = Path(__file__).resolve().parent
PACK = ROOT / "cosmoforge_damage_repair_kit.glb"
INDIVIDUAL = ROOT / "damage_repair_individual"

EXPECTED_PARTS = {
    "Damage_BentAntenna", "Damage_CrackedLens", "Damage_LensChip",
    "Damage_ScorchedPanel_L", "Damage_ScorchedPanel_R",
    "Damage_BentPanel_L", "Damage_BentPanel_R",
    "Damage_Dent_Small", "Damage_Dent_Large",
    "Damage_Scratches_Light", "Damage_Scratches_Heavy",
    "Damage_LooseWire_A", "Damage_LooseWire_B", "Damage_OpenAccessPanel",
    "Damage_HeatStain", "Damage_ImpactMark",
    "Repair_TapeStrip_A", "Repair_TapeStrip_B", "Repair_TapeCross",
    "Repair_PatchPlate_Small", "Repair_PatchPlate_Large",
    "Repair_ReplacementPanel_L", "Repair_ReplacementPanel_R",
    "Repair_EmergencyClamp", "Repair_CableTieBundle",
    "Repair_MismatchedAntenna", "Repair_ReinforcedCorner", "Repair_WeldedSeam",
    "Veteran_MissionSticker_01", "Veteran_MissionSticker_02",
    "Veteran_MissionSticker_03", "Veteran_WarningSticker",
    "Veteran_MaintenanceMark", "Veteran_LuckyBolt",
}

EXPECTED_HELPERS = {
    "Attach_Antenna", "Attach_Lens", "Attach_Panel_L", "Attach_Panel_R",
    "Attach_BodyFront", "Attach_BodySide_L", "Attach_BodySide_R",
    "Attach_Thruster", "Attach_Cargo",
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


assert PACK.exists() and PACK.stat().st_size > 0, "Combined GLB is missing or empty"
individual_files = list(INDIVIDUAL.glob("*.glb"))
assert len(individual_files) == len(EXPECTED_PARTS), (
    f"Expected {len(EXPECTED_PARTS)} individual GLBs, found {len(individual_files)}"
)
assert {path.stem for path in individual_files} == EXPECTED_PARTS, "Individual export names differ"

clear_scene()
bpy.ops.import_scene.gltf(filepath=str(PACK))
imported_names = {obj.name for obj in bpy.context.scene.objects}
missing_parts = EXPECTED_PARTS - imported_names
missing_helpers = EXPECTED_HELPERS - imported_names
assert not missing_parts, f"Combined GLB missing part roots: {sorted(missing_parts)}"
assert not missing_helpers, f"Combined GLB missing helpers: {sorted(missing_helpers)}"

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
triangles = sum(len(obj.data.loop_triangles) for obj in mesh_objects)
assert mesh_objects, "Combined GLB contains no meshes"

print("DAMAGE/REPAIR EXPORT VALIDATION PASSED")
print(f"Combined GLB: {PACK.stat().st_size / 1024:.1f} KiB")
print(f"Imported objects: {len(imported_names)}")
print(f"Mesh objects: {len(mesh_objects)}")
print(f"Approx. triangles: {triangles}")
print(f"Individual GLBs: {len(individual_files)}")

"""Re-import checks for the generated finds pack. Run inside Blender."""

from pathlib import Path

import bpy


HERE = Path(__file__).resolve().parent
REQUIRED = {
    "Find_MoonRock", "Find_MarsDust", "Find_MeteorFragment", "Find_SolarSample",
    "Find_OldCircuit", "Find_SatelliteFragment", "Find_LuckyBolt", "Find_ImpossibleCube",
    "Find_ExtraStarPhoto", "Find_RadioWhisper", "Find_MapThatLies", "Find_UnknownDebris",
    "Find_FriendShapedVoid", "Find_WrongEarth", "Find_FutureTimestamp",
    "Find_UnscheduledEmotion", "Find_UnknownObject_01", "CargoCase_Common",
    "CargoCase_Rare", "CargoCase_Strange", "CargoCase_Cursed", "Archive_DisplayStand",
}


def clear_objects() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


clear_objects()
bpy.ops.import_scene.gltf(filepath=str(HERE / "cosmoforge_finds_pack.glb"))
names = {obj.name for obj in bpy.context.scene.objects}
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
missing = sorted(REQUIRED - names)
print(f"PACK_VERIFY objects={len(names)} polygons={sum(len(obj.data.polygons) for obj in meshes)} missing={missing}")
assert not missing

individual_files = sorted((HERE / "finds_individual").glob("*.glb"))
failures = []
for path in individual_files:
    clear_objects()
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = {obj.name for obj in bpy.context.scene.objects}
    root = bpy.data.objects.get(path.stem)
    if root is None or root.location.length > 0.001:
        failures.append((path.stem, sorted(imported), tuple(root.location) if root else None))

print(f"INDIVIDUAL_VERIFY count={len(individual_files)} failures={failures}")
assert len(individual_files) == 22
assert not failures

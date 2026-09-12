"""Round-trip validation for the CosmoForge space environment GLB."""

from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parent
PACK = ROOT / "cosmoforge_space_environment_pack.glb"
INDIVIDUAL = ROOT / "space_environment_individual"

REQUIRED = {
    "Planet_Earth", "Earth_Surface", "Earth_Clouds", "Earth_Atmosphere",
    "Planet_Moon", "Moon_CraterForeground", "Planet_Mars", "Mars_Rock_A",
    "Mars_Rock_B", "Mars_Ridge", "Mars_DustCloud", "Planet_Venus",
    "Venus_Surface", "Venus_CloudLayer_01", "Venus_CloudLayer_02",
    "Venus_Atmosphere", "Star_Sun", "Asteroid_A", "Asteroid_B",
    "Asteroid_C", "Asteroid_D", "Asteroid_E", "Asteroid_Fragment_Small",
    "AsteroidField_Demo", "CF_Starfield", "Space_Nebula_Volume",
    "Space_DistantDust", "Space_UnknownGlow", "Space_CursedDistortion",
    "Space_ImpossibleStar", "Orbit_Path", "Mission_TargetMarker",
    "Signal_Ping", "Navigation_Beacon", "Unknown_SignalMarker",
}
EXPECTED_FILES = {"Earth", "Moon", "Mars", "Venus", "Asteroid_Set", "Space_FX", "Orbit_UI", "Sun"}

assert PACK.exists() and PACK.stat().st_size > 0, "Missing combined pack"
files = list(INDIVIDUAL.glob("*.glb"))
assert {path.stem for path in files} == EXPECTED_FILES, "Individual export set differs"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(PACK))
names = {obj.name for obj in bpy.context.scene.objects}
missing = REQUIRED - names
assert not missing, f"Missing required GLB nodes: {sorted(missing)}"

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
triangles = 0
for obj in meshes:
    obj.data.calc_loop_triangles()
    triangles += len(obj.data.loop_triangles)

print("SPACE ENVIRONMENT EXPORT VALIDATION PASSED")
print(f"Combined GLB: {PACK.stat().st_size / 1024:.1f} KiB")
print(f"Imported objects: {len(names)}")
print(f"Mesh objects: {len(meshes)}")
print(f"Approx. triangles: {triangles}")
print(f"Individual GLBs: {len(files)}")

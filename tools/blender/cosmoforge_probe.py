"""Build CosmoForge's modular, stylised probe and export it as Blend + GLB.

Run from a terminal:
    blender --background --python cosmoforge_probe.py

Optional output folder:
    blender --background --python cosmoforge_probe.py -- --output-dir C:/path/to/assets

The Blend file opens with one readable default configuration. Alternative modules,
personality silhouettes, and damage layers are present but hidden. The GLB export
contains every asset object so the game can toggle nodes by name.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


# -----------------------------------------------------------------------------
# Configuration

BODY_COLLECTION = "CosmoForge_Probe"
MODULE_COLLECTION = "CosmoForge_Modules"
DAMAGE_COLLECTION = "CosmoForge_Damage"
PREVIEW_COLLECTION = "CosmoForge_Preview"

MATERIAL_COLOURS = {
    "CF_Body": (0.68, 0.72, 0.70, 1.0),
    "CF_Metal": (0.045, 0.060, 0.075, 1.0),
    "CF_Solar": (0.025, 0.085, 0.18, 1.0),
    "CF_Sensor": (0.00, 0.72, 1.00, 1.0),
    "CF_Accent": (1.00, 0.30, 0.11, 1.0),
    "CF_Damage": (0.10, 0.055, 0.045, 1.0),
}

# Objects visible when the .blend first opens. Every other module remains in the
# file and GLB, but is hidden to avoid several alternatives occupying one mount.
DEFAULT_VISIBLE = {
    "SolarPanel_Small_L",
    "SolarPanel_Small_R",
    "Antenna_Whip",
    "Camera_Main",
    "Thruster_Dual",
    "CargoPod_Small",
    "BatteryPack",
}


# -----------------------------------------------------------------------------
# Scene and material helpers

def parse_output_dir() -> Path:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--output-dir", default=str(Path(__file__).resolve().parent))
    return Path(parser.parse_args(args).output_dir).resolve()


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)


def make_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)


def make_material(name: str, colour: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = colour
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = colour
    principled.inputs["Roughness"].default_value = 0.38
    principled.inputs["Metallic"].default_value = 0.0
    if name in {"CF_Metal", "CF_Damage"}:
        principled.inputs["Metallic"].default_value = 0.72
        principled.inputs["Roughness"].default_value = 0.30
    elif name == "CF_Solar":
        principled.inputs["Metallic"].default_value = 0.25
        principled.inputs["Roughness"].default_value = 0.22
    elif name == "CF_Sensor":
        emission_colour = principled.inputs.get("Emission Color") or principled.inputs.get("Emission")
        emission_strength = principled.inputs.get("Emission Strength")
        if emission_colour:
            emission_colour.default_value = colour
        if emission_strength:
            emission_strength.default_value = 5.0
        principled.inputs["Metallic"].default_value = 0.15
        principled.inputs["Roughness"].default_value = 0.16
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if obj.type == "MESH":
        obj.data.materials.append(material)


def finish_mesh(obj: bpy.types.Object, bevel: float = 0.0) -> bpy.types.Object:
    """Apply transforms, optional lightweight bevel, and angle-based smoothing."""
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Edge Catch Bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    obj.select_set(False)
    return obj


def cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    collection: bpy.types.Collection,
    material: bpy.types.Material,
    bevel: float = 0.06,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    move_to_collection(obj, collection)
    assign_material(obj, material)
    return finish_mesh(obj, bevel)


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    collection: bpy.types.Collection,
    material: bpy.types.Material,
    rotation: tuple[float, float, float] = (0, 0, 0),
    vertices: int = 16,
    bevel: float = 0.035,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    move_to_collection(obj, collection)
    assign_material(obj, material)
    return finish_mesh(obj, bevel)


def sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    collection: bpy.types.Collection,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    move_to_collection(obj, collection)
    assign_material(obj, material)
    return finish_mesh(obj)


def cone(
    name: str,
    location: tuple[float, float, float],
    radius1: float,
    radius2: float,
    depth: float,
    collection: bpy.types.Collection,
    material: bpy.types.Material,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=radius1, radius2=radius2, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    move_to_collection(obj, collection)
    assign_material(obj, material)
    return finish_mesh(obj, 0.025)


def tube_curve(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    collection: bpy.types.Collection,
    material: bpy.types.Material,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(f"{name}_Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 1
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    assign_material(obj, material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj


def set_module_metadata(obj: bpy.types.Object, category: str, enabled: bool = False) -> None:
    obj["cf_category"] = category
    obj["cf_toggleable"] = True
    obj["cf_default_enabled"] = enabled
    obj.hide_viewport = not enabled
    obj.hide_render = not enabled


def parent_keep_world(child: bpy.types.Object, parent: bpy.types.Object) -> None:
    """Parent detail geometry without moving it away from its authored position."""
    world_transform = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = world_transform


# -----------------------------------------------------------------------------
# Probe construction

def build_base(collection, materials) -> list[bpy.types.Object]:
    made = []
    made.append(cube("Probe_Body", (0, 0, 0), (1.18, 0.88, 0.78), collection, materials["CF_Body"], 0.20))
    made.append(cube("Probe_Belly", (0, 0.05, -0.69), (0.92, 0.66, 0.13), collection, materials["CF_Metal"], 0.10))
    made.append(cube("Front_Panel", (0, -0.86, 0.02), (0.88, 0.08, 0.57), collection, materials["CF_Body"], 0.07))
    made.append(cube("ID_Plate", (-0.53, -0.96, -0.37), (0.34, 0.025, 0.13), collection, materials["CF_Accent"], 0.025))
    made[-1]["cf_label"] = "CF-01 / PLEASE RETURN"

    # Dark panel-line strips are geometry so they survive texture-free export.
    made.append(cube("PanelLine_Top", (0, -0.05, 0.79), (0.73, 0.022, 0.018), collection, materials["CF_Metal"], 0.008))
    made.append(cube("PanelLine_Side_L", (-1.19, 0.02, 0.05), (0.018, 0.52, 0.35), collection, materials["CF_Metal"], 0.008))
    made.append(cube("PanelLine_Side_R", (1.19, 0.02, 0.05), (0.018, 0.52, 0.35), collection, materials["CF_Metal"], 0.008))

    # Four chunky universal-looking attachment points.
    for side, x in (("L", -1.27), ("R", 1.27)):
        made.append(cylinder(f"Hardpoint_Solar_{side}", (x, 0, 0.08), 0.17, 0.20, collection, materials["CF_Metal"], (0, math.pi / 2, 0), 12))
    made.append(cylinder("Hardpoint_Top", (0, 0, 0.88), 0.20, 0.16, collection, materials["CF_Metal"], vertices=12))
    made.append(cylinder("Hardpoint_Cargo", (0, 0.12, -0.89), 0.20, 0.16, collection, materials["CF_Metal"], vertices=12))

    # Rear propulsion collar.
    made.append(cube("Rear_Propulsion_Block", (0, 0.93, 0), (0.78, 0.18, 0.55), collection, materials["CF_Metal"], 0.11))
    return made


def build_panel(name, side, length, width, collection, materials, enabled=False):
    sign = -1 if side == "L" else 1
    mount_x = sign * 1.35
    obj = cube(name, (mount_x, 0, 0.08), (length / 2, 0.075, width / 2), collection, materials["CF_Metal"], 0.055)
    # Move backing geometry outward while its object origin stays on the hinge.
    obj.data.transform(Matrix.Translation((sign * length / 2, 0, 0)))
    set_module_metadata(obj, "solar_panel", enabled)
    cell_count = 3 if length < 1.8 else 5
    for index in range(cell_count):
        cell_x = mount_x + sign * ((index + 0.55) * length / cell_count)
        cell = cube(f"{name}_Cell_{index + 1:02d}", (cell_x, -0.086, 0.08), (length / cell_count * 0.42, 0.018, width * 0.42), collection, materials["CF_Solar"], 0.015)
        parent_keep_world(cell, obj)
        set_module_metadata(cell, "solar_panel_detail", enabled)
    return obj


def build_modules(collection, materials) -> list[bpy.types.Object]:
    roots = []
    roots += [
        build_panel("SolarPanel_Small_L", "L", 1.45, 0.76, collection, materials, True),
        build_panel("SolarPanel_Small_R", "R", 1.45, 0.76, collection, materials, True),
        build_panel("SolarPanel_Large_L", "L", 2.30, 1.02, collection, materials),
        build_panel("SolarPanel_Large_R", "R", 2.30, 1.02, collection, materials),
    ]

    whip = tube_curve("Antenna_Whip", [(0, 0, 0.95), (0.04, -0.03, 1.62), (0.12, -0.08, 2.18)], 0.035, collection, materials["CF_Metal"])
    set_module_metadata(whip, "antenna", True)
    roots.append(whip)

    dish = cone("Antenna_Dish", (0, -0.07, 1.28), 0.64, 0.10, 0.24, collection, materials["CF_Body"], (math.pi / 2, 0, 0))
    set_module_metadata(dish, "antenna")
    roots.append(dish)
    feed = cylinder("Antenna_Dish_Feed", (0, -0.55, 1.28), 0.055, 0.52, collection, materials["CF_Accent"], (math.pi / 2, 0, 0), 10)
    parent_keep_world(feed, dish)
    set_module_metadata(feed, "antenna_detail")

    dual = cube("Antenna_Dual", (0, 0, 0.99), (0.25, 0.19, 0.09), collection, materials["CF_Metal"], 0.04)
    set_module_metadata(dual, "antenna")
    roots.append(dual)
    for index, x in enumerate((-0.16, 0.16), 1):
        mast = tube_curve(f"Antenna_Dual_Mast_{index}", [(x, 0, 1.04), (x * 1.35, 0, 1.82)], 0.028, collection, materials["CF_Metal"])
        parent_keep_world(mast, dual)
        set_module_metadata(mast, "antenna_detail")

    camera = cylinder("Camera_Main", (0, -1.11, 0.12), 0.34, 0.40, collection, materials["CF_Metal"], (math.pi / 2, 0, 0), 20)
    set_module_metadata(camera, "camera", True)
    roots.append(camera)
    lens = cylinder("Camera_Main_Lens", (0, -1.33, 0.12), 0.24, 0.035, collection, materials["CF_Sensor"], (math.pi / 2, 0, 0), 20, 0.012)
    parent_keep_world(lens, camera)

    wide = cube("Camera_Wide", (0, -1.01, 0.12), (0.55, 0.18, 0.24), collection, materials["CF_Metal"], 0.10)
    set_module_metadata(wide, "camera")
    roots.append(wide)
    for index, x in enumerate((-0.28, 0, 0.28), 1):
        eye = sphere(f"Camera_Wide_Lens_{index}", (x, -1.22, 0.12), (0.12, 0.055, 0.12), collection, materials["CF_Sensor"])
        parent_keep_world(eye, wide)
        set_module_metadata(eye, "camera_detail")

    sensor = cube("Sensor_Array", (0, -1.02, 0.12), (0.62, 0.15, 0.42), collection, materials["CF_Metal"], 0.08)
    set_module_metadata(sensor, "camera")
    roots.append(sensor)
    for row in range(2):
        for column in range(4):
            eye = sphere(f"Sensor_Array_Cell_{row}_{column}", (-0.42 + column * 0.28, -1.20, -0.02 + row * 0.28), (0.075, 0.035, 0.075), collection, materials["CF_Sensor"])
            parent_keep_world(eye, sensor)
            set_module_metadata(eye, "camera_detail")

    small = cone("Thruster_Small", (0, 1.25, 0), 0.31, 0.22, 0.52, collection, materials["CF_Metal"], (math.pi / 2, 0, 0))
    set_module_metadata(small, "propulsion")
    roots.append(small)
    dual_thruster = cube("Thruster_Dual", (0, 1.05, 0), (0.55, 0.12, 0.30), collection, materials["CF_Metal"], 0.08)
    set_module_metadata(dual_thruster, "propulsion", True)
    roots.append(dual_thruster)
    for index, x in enumerate((-0.34, 0.34), 1):
        nozzle = cone(f"Thruster_Dual_Nozzle_{index}", (x, 1.35, 0), 0.24, 0.16, 0.46, collection, materials["CF_Metal"], (math.pi / 2, 0, 0))
        parent_keep_world(nozzle, dual_thruster)
        set_module_metadata(nozzle, "propulsion_detail", True)

    ion = cylinder("IonDrive", (0, 1.22, 0), 0.57, 0.38, collection, materials["CF_Metal"], (math.pi / 2, 0, 0), 20)
    set_module_metadata(ion, "propulsion")
    roots.append(ion)
    ion_glow = cylinder("IonDrive_Glow", (0, 1.43, 0), 0.43, 0.025, collection, materials["CF_Sensor"], (math.pi / 2, 0, 0), 20, 0.01)
    parent_keep_world(ion_glow, ion)
    set_module_metadata(ion_glow, "propulsion_detail")

    cargo_small = cube("CargoPod_Small", (0, 0.05, -1.03), (0.48, 0.48, 0.25), collection, materials["CF_Metal"], 0.12)
    set_module_metadata(cargo_small, "cargo", True)
    roots.append(cargo_small)
    cargo_large = cube("CargoPod_Large", (0, 0.05, -1.09), (0.78, 0.62, 0.31), collection, materials["CF_Metal"], 0.14)
    set_module_metadata(cargo_large, "cargo")
    roots.append(cargo_large)

    utilities = [
        ("BatteryPack", (-0.70, 0.62, 0.70), (0.40, 0.25, 0.17), "CF_Accent", True),
        ("ScienceModule", (0.66, 0.58, 0.69), (0.42, 0.29, 0.20), "CF_Body", False),
        ("CommunicationsBox", (0, 0.58, 0.75), (0.46, 0.27, 0.16), "CF_Metal", False),
    ]
    for name, location, scale, material_name, enabled in utilities:
        utility = cube(name, location, scale, collection, materials[material_name], 0.07)
        set_module_metadata(utility, "utility", enabled)
        roots.append(utility)
    return roots


def build_damage(collection, materials) -> list[bpy.types.Object]:
    damage = []
    damage.append(tube_curve("Damage_BentAntenna", [(0, 0, 0.95), (0.0, 0, 1.45), (0.25, 0.02, 1.76), (0.46, 0.06, 1.61)], 0.045, collection, materials["CF_Damage"]))
    damage.append(cube("Damage_ScorchedPanel", (-2.10, -0.16, 0.08), (0.44, 0.018, 0.23), collection, materials["CF_Damage"], 0.06))
    cracked = tube_curve("Damage_CrackedLens", [(0, -1.36, 0.33), (-0.04, -1.37, 0.17), (0.12, -1.37, 0.04), (0.03, -1.37, -0.09)], 0.014, collection, materials["CF_Damage"])
    damage.append(cracked)
    damage.append(sphere("Damage_DentedBody", (1.14, -0.18, 0.30), (0.10, 0.34, 0.27), collection, materials["CF_Damage"]))
    taped = cube("Damage_TapedRepair", (-0.72, -0.93, 0.28), (0.29, 0.025, 0.10), collection, materials["CF_Accent"], 0.018)
    taped.rotation_euler.y = -0.25
    finish_mesh(taped)
    damage.append(taped)
    damage.append(tube_curve("Damage_LooseWire", [(1.10, 0.16, -0.42), (1.34, 0.16, -0.60), (1.18, 0.18, -0.82), (1.40, 0.20, -0.95)], 0.025, collection, materials["CF_Accent"]))
    for obj in damage:
        set_module_metadata(obj, "damage")
    return damage


def build_personality_shapes(collection, materials) -> list[bpy.types.Object]:
    """Optional overlays that exaggerate the same family silhouette."""
    shapes = []
    anxious = cube("Personality_ANXIOUS_CompactShell", (0, 0, 0), (1.02, 0.76, 0.68), collection, materials["CF_Body"], 0.22)
    anxious["cf_notes"] = "Compact shell; pair with Whip antenna and Small panels."
    dramatic = cone("Personality_DRAMATIC_OversizedDish", (0, -0.05, 1.36), 0.88, 0.10, 0.29, collection, materials["CF_Body"], (math.pi / 2, 0, 0))
    dramatic["cf_notes"] = "Pair with Large panels for the widest silhouette."
    chaotic = cube("Personality_CHAOTIC_ImprovisedPod", (0.86, 0.45, -0.55), (0.43, 0.29, 0.25), collection, materials["CF_Accent"], 0.09)
    chaotic.rotation_euler.y = 0.16
    finish_mesh(chaotic)
    chaotic["cf_notes"] = "Asymmetric bolt-on pod; pair one Large and one Small panel."
    shapes.extend((anxious, dramatic, chaotic))
    for obj in shapes:
        set_module_metadata(obj, "personality_shape")
    return shapes


# -----------------------------------------------------------------------------
# Studio preview and export

def point_at(obj: bpy.types.Object, target=(0, 0, 0)) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def build_studio(collection, materials) -> None:
    ground = cylinder("Preview_Ground", (0, 0, -1.42), 5.4, 0.18, collection, materials["CF_Metal"], vertices=64, bevel=0.08)
    ground["cf_export"] = False

    bpy.ops.object.light_add(type="AREA", location=(4.5, -5.0, 6.0))
    key = bpy.context.object
    key.name = "Preview_Key"
    key.data.energy = 950
    key.data.shape = "DISK"
    key.data.size = 5.0
    point_at(key, (0, 0, 0))
    move_to_collection(key, collection)

    bpy.ops.object.light_add(type="AREA", location=(-4.0, 2.5, 3.0))
    rim = bpy.context.object
    rim.name = "Preview_Cyan_Rim"
    rim.data.energy = 700
    rim.data.color = (0.0, 0.55, 1.0)
    rim.data.size = 3.0
    point_at(rim, (0, 0, 0.2))
    move_to_collection(rim, collection)

    bpy.ops.object.camera_add(location=(7.2, -9.0, 5.8))
    camera = bpy.context.object
    camera.name = "Preview_Camera"
    camera.data.lens = 58
    point_at(camera, (0, 0, 0.15))
    move_to_collection(camera, collection)
    bpy.context.scene.camera = camera

    world = bpy.context.scene.world or bpy.data.worlds.new("CosmoForge_Studio")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.004, 0.008, 0.018, 1.0)
    background.inputs["Strength"].default_value = 0.20

    scene = bpy.context.scene
    # Blender 4.x called this EEVEE_NEXT; Blender 5.x returned to EEVEE.
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        scene.view_settings.look = "Medium High Contrast"


def export_assets(output_dir: Path, asset_collections: list[bpy.types.Collection]) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    blend_path = output_dir / "cosmoforge_probe.blend"
    glb_path = output_dir / "cosmoforge_probe.glb"

    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    bpy.ops.object.select_all(action="DESELECT")
    export_objects = []
    for collection in asset_collections:
        for obj in collection.all_objects:
            if obj.type in {"MESH", "EMPTY"}:
                export_objects.append(obj)
                obj.hide_set(False)
                obj.hide_viewport = False
                obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
        export_cameras=False,
        export_lights=False,
    )

    # Restore the clean default display and resave the authoring file.
    for obj in export_objects:
        if obj.get("cf_toggleable"):
            enabled = bool(obj.get("cf_default_enabled", False))
            obj.hide_viewport = not enabled
            obj.hide_render = not enabled
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    return blend_path, glb_path


def main() -> None:
    output_dir = parse_output_dir()
    reset_scene()
    probe_collection = make_collection(BODY_COLLECTION)
    module_collection = make_collection(MODULE_COLLECTION)
    damage_collection = make_collection(DAMAGE_COLLECTION)
    preview_collection = make_collection(PREVIEW_COLLECTION)
    materials = {name: make_material(name, colour) for name, colour in MATERIAL_COLOURS.items()}

    build_base(probe_collection, materials)
    build_modules(module_collection, materials)
    build_damage(damage_collection, materials)
    build_personality_shapes(module_collection, materials)
    build_studio(preview_collection, materials)
    output_dir.mkdir(parents=True, exist_ok=True)
    preview_path = output_dir / "cosmoforge_probe_preview.png"
    bpy.context.scene.render.filepath = str(preview_path)
    bpy.ops.render.render(write_still=True)
    blend_path, glb_path = export_assets(output_dir, [probe_collection, module_collection, damage_collection])

    generated = sorted(
        obj.name
        for collection in (probe_collection, module_collection, damage_collection)
        for obj in collection.all_objects
    )
    print("\n=== COSMOFORGE PROBE GENERATED ===")
    print(f"Blend: {blend_path}")
    print(f"GLB:   {glb_path}")
    print(f"Preview: {preview_path}")
    print("\nGenerated asset objects:")
    for name in generated:
        print(f"  - {name}")
    print("\nToggle modular roots in CosmoForge_Modules; child details follow their parent.")
    print("Toggle scars in CosmoForge_Damage. They are hidden by default.")
    print("Change CF_Accent's Base Color to recolour plates, tape and utility accents.")


if __name__ == "__main__":
    main()

"""Generate Hangar 3, a compact modular docking bay for CosmoForge probes.

Run headlessly:
    blender --background --python cosmoforge_hangar3.py

Optional output folder:
    blender --background --python cosmoforge_hangar3.py -- --output-dir C:/assets

The existing cosmoforge_probe.blend beside this script is appended for scale and
preview only. It is deliberately excluded from the hangar GLB so the game can
load a probe character and Hangar 3 independently.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


STRUCTURE = "CosmoForge_Hangar_Structure"
DOCK = "CosmoForge_Hangar_Dock"
PROPS = "CosmoForge_Hangar_Props"
LIGHTS = "CosmoForge_Hangar_Lights"
CAMERAS = "CosmoForge_Hangar_Cameras"
REFERENCE = "CosmoForge_Probe_Reference"

COLOURS = {
    "CF_HangarMetal": (0.11, 0.14, 0.17, 1.0),
    "CF_HangarDark": (0.025, 0.038, 0.052, 1.0),
    "CF_HangarPanel": (0.27, 0.31, 0.32, 1.0),
    "CF_HangarFloor": (0.075, 0.09, 0.105, 1.0),
    "CF_HangarWarning": (0.94, 0.43, 0.055, 1.0),
    "CF_HangarLight_Cyan": (0.00, 0.72, 1.00, 1.0),
    "CF_HangarLight_Amber": (1.00, 0.34, 0.045, 1.0),
    "CF_HangarGlass": (0.025, 0.16, 0.21, 0.55),
}


def output_directory() -> Path:
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


def collection(name: str) -> bpy.types.Collection:
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


def move_to(obj: bpy.types.Object, target: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)


def material(name: str, colour: tuple[float, float, float, float]) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = colour
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = colour
    shader.inputs["Roughness"].default_value = 0.42
    if name in {"CF_HangarMetal", "CF_HangarDark"}:
        shader.inputs["Metallic"].default_value = 0.72
        shader.inputs["Roughness"].default_value = 0.31
    elif "Light" in name:
        emission = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        strength = shader.inputs.get("Emission Strength")
        if emission:
            emission.default_value = colour
        if strength:
            strength.default_value = 5.5
        shader.inputs["Roughness"].default_value = 0.20
    elif name == "CF_HangarGlass":
        shader.inputs["Metallic"].default_value = 0.12
        shader.inputs["Roughness"].default_value = 0.12
        transmission = shader.inputs.get("Transmission Weight") or shader.inputs.get("Transmission")
        if transmission:
            transmission.default_value = 0.35
    return mat


def apply_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.type in {"MESH", "CURVE", "FONT"}:
        obj.data.materials.append(mat)


def finish(obj: bpy.types.Object, bevel: float = 0.0) -> bpy.types.Object:
    if obj.type != "MESH":
        return obj
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Soft Industrial Edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    return obj


def box(name, location, scale, target, mat, bevel=0.06, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    move_to(obj, target)
    apply_material(obj, mat)
    return finish(obj, bevel)


def cylinder(name, location, radius, depth, target, mat, rotation=(0, 0, 0), vertices=16, bevel=0.035):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    move_to(obj, target)
    apply_material(obj, mat)
    return finish(obj, bevel)


def tube(name, points, radius, target, mat):
    curve = bpy.data.curves.new(f"{name}_Path", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 1
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
    obj = bpy.data.objects.new(name, curve)
    target.objects.link(obj)
    apply_material(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj


def parent_keep_world(child: bpy.types.Object, parent: bpy.types.Object) -> None:
    transform = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = transform


def pivot_at(obj: bpy.types.Object, world_pivot: tuple[float, float, float]) -> None:
    """Move an object's origin to an animation pivot without moving its mesh."""
    local_pivot = obj.matrix_world.inverted() @ Vector(world_pivot)
    obj.data.transform(Matrix.Translation(-local_pivot))
    obj.matrix_world.translation = Vector(world_pivot)


def text_mesh(name, body, location, size, target, mat, rotation=(math.pi / 2, 0, 0), align="CENTER"):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = align
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.resolution_u = 1
    obj.data.extrude = 0.004
    obj.data.bevel_depth = 0.0
    move_to(obj, target)
    apply_material(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    obj["cf_replaceable_sign"] = True
    obj["cf_text"] = body
    return obj


def toggleable(obj, category, mobile_optional=False):
    obj["cf_category"] = category
    obj["cf_animation_ready"] = category in {"door", "clamp", "repair_arm", "inspection_light", "rail_carriage"}
    obj["cf_mobile_optional"] = mobile_optional
    return obj


def warning_stripes(prefix, centre, width, count, target, mats, vertical=False):
    """A few geometric stripes: readable at distance and texture-free."""
    made = []
    for index in range(count):
        offset = (index - (count - 1) / 2) * width
        if vertical:
            location = (centre[0] + offset, centre[1], centre[2])
            scale = (width * 0.32, 0.025, 0.31)
            rotation = (0, 0, -0.45)
        else:
            location = (centre[0] + offset, centre[1], centre[2])
            scale = (width * 0.32, 0.025, 0.12)
            rotation = (0, 0, -0.45)
        stripe = box(f"{prefix}_{index + 1:02d}", location, scale, target, mats["CF_HangarWarning"], 0.012, rotation)
        stripe["cf_mobile_optional"] = True
        made.append(stripe)
    return made


def build_structure(target, mats):
    # Compact room: open camera side, partial side walls, and a shallow ceiling.
    box("Hangar_Floor", (0, 0, -1.62), (5.4, 4.5, 0.14), target, mats["CF_HangarFloor"], 0.08)
    box("Hangar_BackWall", (0, 3.75, 1.7), (5.4, 0.16, 3.45), target, mats["CF_HangarDark"], 0.08)
    box("Hangar_SideWall_L", (-5.22, 0.55, 1.15), (0.18, 3.35, 2.9), target, mats["CF_HangarMetal"], 0.08)
    box("Hangar_SideWall_R", (5.22, 0.55, 1.15), (0.18, 3.35, 2.9), target, mats["CF_HangarMetal"], 0.08)
    box("Hangar_Ceiling", (0, 0.8, 4.46), (5.35, 3.05, 0.12), target, mats["CF_HangarDark"], 0.06)

    # Door frame and sliding halves. Pivots sit at outer edges for future sliding/folding.
    box("DoorFrame_Top", (0, 3.48, 4.0), (3.85, 0.28, 0.28), target, mats["CF_HangarMetal"], 0.07)
    box("DoorFrame_L", (-3.62, 3.48, 1.20), (0.28, 0.28, 2.55), target, mats["CF_HangarMetal"], 0.07)
    box("DoorFrame_R", (3.62, 3.48, 1.20), (0.28, 0.28, 2.55), target, mats["CF_HangarMetal"], 0.07)
    left = box("HangarDoor_Left", (-1.76, 3.58, 1.18), (1.72, 0.16, 2.45), target, mats["CF_HangarPanel"], 0.06)
    right = box("HangarDoor_Right", (1.76, 3.58, 1.18), (1.72, 0.16, 2.45), target, mats["CF_HangarPanel"], 0.06)
    pivot_at(left, (-3.48, 3.58, 1.18))
    pivot_at(right, (3.48, 3.58, 1.18))
    toggleable(left, "door")
    toggleable(right, "door")

    for side, x in (("L", -1.76), ("R", 1.76)):
        for row, z in enumerate((-0.55, 0.32, 1.19, 2.06, 2.93), 1):
            panel = box(f"HangarDoor_{side}_Segment_{row:02d}", (x, 3.39, z), (1.48, 0.035, 0.32), target, mats["CF_HangarDark"], 0.025)
            parent_keep_world(panel, left if side == "L" else right)
        warning_stripes(f"DoorWarning_{side}", (x, 3.18, -0.98), 0.44, 6, target, mats)

    # Repeated chunky wall ribs and recessed panels.
    for index, x in enumerate((-4.55, -3.75, 3.75, 4.55), 1):
        box(f"WallSupport_{index:02d}", (x, 3.25, 1.2), (0.18, 0.26, 2.70), target, mats["CF_HangarMetal"], 0.05)
    for side, x in (("L", -4.93), ("R", 4.93)):
        for index, y in enumerate((-1.5, 0.15, 1.8), 1):
            box(f"WallPanel_{side}_{index:02d}", (x, y, 1.15), (0.04, 0.62, 1.04), target, mats["CF_HangarPanel"], 0.045)
            box(f"CableChannel_{side}_{index:02d}", (x * 0.996, y, 2.72), (0.06, 0.66, 0.10), target, mats["CF_HangarWarning"], 0.025)

    # Overhead support beams frame the probe without enclosing the whole view.
    for index, y in enumerate((-1.4, 0.8, 2.8), 1):
        box(f"CeilingBeam_{index:02d}", (0, y, 4.12), (5.0, 0.17, 0.20), target, mats["CF_HangarMetal"], 0.055)

    # Simple vents, seam lines and bolt heads on the back wall.
    for side, x in (("L", -4.25), ("R", 4.25)):
        vent = box(f"WallVent_{side}", (x, 3.47, 2.45), (0.48, 0.04, 0.65), target, mats["CF_HangarDark"], 0.05)
        for slot in range(5):
            slat = box(f"WallVent_{side}_Slat_{slot + 1}", (x, 3.38, 2.05 + slot * 0.20), (0.38, 0.025, 0.035), target, mats["CF_HangarMetal"], 0.01)
            parent_keep_world(slat, vent)
    for index, x in enumerate((-4.7, -3.8, 3.8, 4.7), 1):
        for z_index, z in enumerate((-0.7, 3.3), 1):
            cylinder(f"BackWall_Bolt_{index}_{z_index}", (x, 3.30, z), 0.07, 0.04, target, mats["CF_HangarWarning"], (math.pi / 2, 0, 0), 10, 0.01)


def build_dock(target, mats):
    base = box("Dock_Base", (0, 0.18, -1.36), (2.15, 1.45, 0.17), target, mats["CF_HangarMetal"], 0.12)
    base["cf_probe_origin"] = [0.0, 0.0, 0.0]
    carriage = box("LaunchRail_Carriage", (0, 0.40, -1.18), (1.20, 0.80, 0.10), target, mats["CF_HangarPanel"], 0.08)
    toggleable(carriage, "rail_carriage")
    for side, x in (("L", -1.68), ("R", 1.68)):
        arm = box(f"Dock_Arm_{side}", (x, 0.12, -0.35), (0.15, 0.22, 0.86), target, mats["CF_HangarMetal"], 0.08)
        pivot_at(arm, (x, 0.12, -1.20))
        toggleable(arm, "support_arm")
        clamp_x = -1.29 if side == "L" else 1.29
        clamp = box(f"Dock_Clamp_{side}", (clamp_x, 0.04, 0.11), (0.38, 0.18, 0.13), target, mats["CF_HangarWarning"], 0.07)
        pivot_at(clamp, (x, 0.04, 0.11))
        toggleable(clamp, "clamp")

    tube("Dock_Cable", [(-1.82, 0.42, -1.22), (-2.25, 0.30, -1.45), (-2.36, -0.28, -1.47), (-1.95, -0.62, -1.38), (-1.55, -0.40, -0.80)], 0.055, target, mats["CF_HangarDark"])
    light = box("Dock_LightStrip", (0, -1.16, -1.14), (1.20, 0.055, 0.035), target, mats["CF_HangarLight_Cyan"], 0.018)
    light["cf_emissive"] = True

    # Two rails lead only as far as the door: enough suggestion, no giant launch system.
    for side, x in (("L", -0.72), ("R", 0.72)):
        box(f"LaunchRail_04_{side}", (x, 1.72, -1.43), (0.10, 2.15, 0.09), target, mats["CF_HangarMetal"], 0.035)
    for index, y in enumerate((-0.15, 0.60, 1.35, 2.10, 2.85), 1):
        box(f"LaunchRail_Sleeper_{index:02d}", (0, y, -1.46), (1.12, 0.08, 0.055), target, mats["CF_HangarPanel"], 0.025)


def build_props(target, mats):
    # Maintenance bay on camera-right.
    bench = box("Maintenance_ToolBench", (3.55, 1.12, -0.70), (1.05, 0.52, 0.10), target, mats["CF_HangarPanel"], 0.07)
    for index, x in enumerate((2.78, 4.32), 1):
        leg = box(f"Maintenance_BenchLeg_{index}", (x, 1.12, -1.14), (0.10, 0.38, 0.43), target, mats["CF_HangarMetal"], 0.04)
        parent_keep_world(leg, bench)
    screen = box("Diagnostic_Screen", (3.65, 1.28, 0.06), (0.68, 0.12, 0.43), target, mats["CF_HangarDark"], 0.07, (-0.12, 0, 0))
    glass = box("Diagnostic_Screen_Glass", (3.65, 1.13, 0.06), (0.55, 0.025, 0.32), target, mats["CF_HangarGlass"], 0.035, (-0.12, 0, 0))
    parent_keep_world(glass, screen)
    box("Diagnostic_Screen_Line", (3.65, 1.09, 0.06), (0.38, 0.018, 0.025), target, mats["CF_HangarLight_Cyan"], 0.012, (-0.12, 0, 0))

    repair_base = cylinder("RepairArm_Base", (4.45, 0.10, -1.18), 0.34, 0.28, target, mats["CF_HangarMetal"], vertices=16)
    repair = box("RepairArm", (4.25, 0.04, -0.20), (0.13, 0.17, 0.88), target, mats["CF_HangarWarning"], 0.07, (0, -0.24, 0))
    pivot_at(repair, (4.45, 0.04, -1.04))
    toggleable(repair, "repair_arm")
    parent_keep_world(repair, repair_base)
    tool = cylinder("RepairArm_Tool", (4.02, -0.02, 0.66), 0.16, 0.38, target, mats["CF_HangarMetal"], (math.pi / 2, 0, 0), 12)
    parent_keep_world(tool, repair)

    lamp_arm = box("InspectionLight_Arm", (2.70, 0.18, 1.20), (0.09, 0.09, 1.00), target, mats["CF_HangarMetal"], 0.05, (0, 0.42, 0))
    pivot_at(lamp_arm, (2.30, 0.18, 0.30))
    toggleable(lamp_arm, "inspection_light")
    lamp = cylinder("InspectionLight", (3.08, -0.02, 2.08), 0.27, 0.22, target, mats["CF_HangarLight_Amber"], (math.pi / 2, 0, 0), 16)
    parent_keep_world(lamp, lamp_arm)
    toggleable(lamp, "inspection_light")

    # A deliberately restrained handful of lovable safety violations.
    toolbox = box("Prop_Toolbox", (3.18, 0.80, -0.47), (0.42, 0.28, 0.20), target, mats["CF_HangarWarning"], 0.08)
    box("Prop_Toolbox_Handle", (3.18, 0.80, -0.18), (0.24, 0.055, 0.08), target, mats["CF_HangarDark"], 0.035)
    cart = box("Prop_RepairCart", (-3.65, 0.65, -0.84), (0.72, 0.52, 0.58), target, mats["CF_HangarPanel"], 0.09)
    for index, x in enumerate((-4.12, -3.18), 1):
        wheel = cylinder(f"Prop_RepairCart_Wheel_{index}", (x, 0.65, -1.42), 0.16, 0.11, target, mats["CF_HangarDark"], (0, math.pi / 2, 0), 12)
        parent_keep_world(wheel, cart)

    crate = box("Prop_BatteredCrate", (-4.10, 2.30, -0.91), (0.62, 0.60, 0.56), target, mats["CF_HangarMetal"], 0.08, (0, 0, -0.05))
    crate["cf_note"] = "Mildred was absolutely found behind this. Probably."
    warning_stripes("Crate_Stripe", (-4.10, 1.68, -0.90), 0.27, 4, target, mats)

    spare_dish = cylinder("Prop_SpareAntenna", (-3.58, 0.56, -0.08), 0.28, 0.12, target, mats["CF_HangarPanel"], (math.pi / 2, 0, 0), 16)
    parent_keep_world(spare_dish, cart)
    spare_panel = box("Prop_SpareSolarPanel", (-3.65, 0.36, 0.34), (0.65, 0.07, 0.30), target, mats["CF_HangarGlass"], 0.045, (0, 0, 0.12))
    parent_keep_world(spare_panel, cart)

    tablet = box("Prop_TabletStand", (2.45, -1.32, -0.35), (0.32, 0.16, 0.48), target, mats["CF_HangarDark"], 0.06, (0.12, 0, 0))
    box("Prop_TabletScreen", (2.45, -1.50, -0.32), (0.24, 0.025, 0.34), target, mats["CF_HangarGlass"], 0.03, (0.12, 0, 0))
    mug = cylinder("Prop_IrresponsibleCoffeeMug", (4.02, 0.96, -0.45), 0.12, 0.22, target, mats["CF_HangarWarning"], vertices=14, bevel=0.025)
    mug["cf_note"] = "Not secured for launch. Again."
    tube("Prop_CoffeeMug_Handle", [(4.12, 0.96, -0.40), (4.24, 0.96, -0.36), (4.25, 0.96, -0.51), (4.12, 0.96, -0.54)], 0.028, target, mats["CF_HangarWarning"])
    loose = tube("Prop_LooseCable", [(-2.8, -1.80, -1.48), (-2.2, -1.50, -1.48), (-2.55, -1.05, -1.48), (-3.10, -1.10, -1.48), (-3.38, -0.70, -1.48)], 0.035, target, mats["CF_HangarWarning"])
    toggleable(loose, "prop", True)

    # Replaceable mesh text—no baked texture atlas required.
    text_mesh("Sign_Hangar3", "HANGAR 3", (0, 3.15, 3.18), 0.52, target, mats["CF_HangarLight_Amber"])
    text_mesh("Sign_LaunchRail04", "LAUNCH RAIL 04", (0, 3.14, -0.92), 0.22, target, mats["CF_HangarPanel"])
    text_mesh("Sign_ProbeBay", "PROBE BAY", (-4.92, -0.72, 2.92), 0.27, target, mats["CF_HangarWarning"], (math.pi / 2, 0, math.pi / 2))
    text_mesh("Sign_MostlyAssembled", "PLEASE REMAIN MOSTLY ASSEMBLED", (3.55, 1.62, 0.66), 0.13, target, mats["CF_HangarWarning"])
    text_mesh("Sign_NoSentience", "NO UNSCHEDULED SENTIENCE", (-3.65, 0.04, 0.95), 0.16, target, mats["CF_HangarWarning"])
    logo_plate = box("CosmoForge_Mark_Plate", (-2.55, 3.16, 3.18), (0.58, 0.04, 0.19), target, mats["CF_HangarDark"], 0.04)
    text_mesh("CosmoForge_Mark", "CF //", (-2.55, 3.10, 3.18), 0.20, target, mats["CF_HangarLight_Cyan"])
    toggleable(logo_plate, "signage", True)


def point_at(obj: bpy.types.Object, target=(0, 0, 0)) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def build_lighting(target, mats):
    # Four actual lights; emissive strips provide the rest of the visible fixtures.
    def area(name, location, energy, colour, size, aim):
        # Spot lights export through KHR_lights_punctual; Blender area lights do not.
        bpy.ops.object.light_add(type="SPOT", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = colour
        light.data.spot_size = math.radians(105)
        light.data.spot_blend = 0.80
        light.data.shadow_soft_size = size * 0.32
        point_at(light, aim)
        move_to(light, target)
        return light

    area("Light_Overhead_Key", (0, -0.6, 4.0), 1100, (0.92, 0.96, 1.0), 4.0, (0, 0, 0))
    area("Light_Dock_Cyan", (-2.6, -0.5, 0.5), 520, (0.0, 0.58, 1.0), 2.5, (0, 0, 0))
    area("Light_Warning_Amber", (4.2, 1.2, 2.6), 420, (1.0, 0.20, 0.035), 1.7, (1.2, 0, 0))
    emergency = area("Light_Emergency_Red", (-4.1, 2.7, 3.1), 0, (1.0, 0.015, 0.01), 1.0, (0, 0.5, 0))
    emergency["cf_optional_light"] = True

    # Two soft authoring lights make Blender previews predictable. glTF ignores
    # AREA lights; the four supported spot lights above carry runtime lighting.
    for name, location, energy, colour, size, aim in (
        ("Preview_SoftKey", (4.5, -4.5, 6.0), 820, (0.92, 0.96, 1.0), 5.0, (0, 0, 0)),
        ("Preview_CyanFill", (-4.0, -1.0, 2.8), 280, (0.0, 0.48, 1.0), 3.0, (0, 0, 0)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        preview_light = bpy.context.object
        preview_light.name = name
        preview_light.data.energy = energy
        preview_light.data.color = colour
        preview_light.data.shape = "DISK"
        preview_light.data.size = size
        point_at(preview_light, aim)
        move_to(preview_light, target)
        preview_light["cf_preview_only"] = True

    for index, x in enumerate((-2.8, 0, 2.8), 1):
        fixture = box(f"Overhead_Fixture_{index:02d}", (x, 0.0, 4.22), (0.75, 0.20, 0.045), target, mats["CF_HangarPanel"], 0.035)
        strip = box(f"Overhead_LightStrip_{index:02d}", (x, -0.02, 4.16), (0.58, 0.14, 0.025), target, mats["CF_HangarLight_Cyan"], 0.02)
        toggleable(fixture, "light_fixture", True)
        toggleable(strip, "light_fixture", True)
    for side, x in (("L", -3.25), ("R", 3.25)):
        box(f"Door_StatusLight_{side}", (x, 3.12, 3.48), (0.12, 0.035, 0.12), target, mats["CF_HangarLight_Amber"], 0.04)


def build_cameras(target):
    camera_specs = {
        "Camera_Onboarding": ((8.4, -10.5, 5.6), (0, 0.25, 0.25), 52),
        "Camera_Return": ((5.5, -8.4, 1.25), (0, 0.25, -0.05), 48),
        "Camera_Inspection": ((6.1, -3.9, 2.15), (0.25, 0.0, 0.05), 66),
        "Camera_Launch": ((0.0, -10.8, 3.0), (0, 0.75, 0.35), 48),
    }
    cameras = {}
    for name, (location, aim, lens) in camera_specs.items():
        bpy.ops.object.camera_add(location=location)
        camera = bpy.context.object
        camera.name = name
        camera.data.lens = lens
        camera.data.sensor_width = 36
        point_at(camera, aim)
        move_to(camera, target)
        camera["cf_probe_focal_point"] = list(aim)
        cameras[name] = camera
    bpy.context.scene.camera = cameras["Camera_Onboarding"]
    return cameras


def append_probe_reference(script_dir: Path) -> bpy.types.Collection | None:
    probe_file = script_dir / "cosmoforge_probe.blend"
    if not probe_file.exists():
        print(f"NOTE: Probe reference not found at {probe_file}; hangar will still be generated.")
        return None
    before = set(bpy.data.objects)
    directory = str(probe_file / "Collection") + "\\"
    bpy.ops.wm.append(directory=directory, filename="CosmoForge_Probe")
    bpy.ops.wm.append(directory=directory, filename="CosmoForge_Modules")
    new_objects = set(bpy.data.objects) - before
    reference = bpy.data.collections.new(REFERENCE)
    bpy.context.scene.collection.children.link(reference)
    for obj in new_objects:
        for owner in list(obj.users_collection):
            owner.objects.unlink(obj)
        reference.objects.link(obj)
        obj["cf_preview_only"] = True
    return reference


def configure_scene() -> None:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        scene.view_settings.look = "Medium High Contrast"
    world = bpy.context.scene.world or bpy.data.worlds.new("Hangar3_World")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.003, 0.006, 0.012, 1.0)
    background.inputs["Strength"].default_value = 0.18


def render_previews(out: Path, cameras: dict[str, bpy.types.Object]) -> list[Path]:
    scene = bpy.context.scene
    previews = []
    for name, camera in cameras.items():
        scene.camera = camera
        scene.render.resolution_x = 1000
        scene.render.resolution_y = 700
        path = out / f"cosmoforge_hangar3_{name.removeprefix('Camera_').lower()}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        previews.append(path)
    # Check that the onboarding composition also survives a portrait/mobile crop.
    scene.camera = cameras["Camera_Onboarding"]
    scene.render.resolution_x = 700
    scene.render.resolution_y = 900
    mobile = out / "cosmoforge_hangar3_onboarding_mobile.png"
    scene.render.filepath = str(mobile)
    bpy.ops.render.render(write_still=True)
    previews.append(mobile)
    return previews


def export(out, export_collections, cameras):
    blend_path = out / "cosmoforge_hangar3.blend"
    glb_path = out / "cosmoforge_hangar3.glb"
    bpy.context.scene.camera = cameras["Camera_Onboarding"]
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.object.select_all(action="DESELECT")
    for group in export_collections:
        for obj in group.all_objects:
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
        export_cameras=True,
        export_lights=True,
    )
    return blend_path, glb_path


def main():
    out = output_directory()
    out.mkdir(parents=True, exist_ok=True)
    reset_scene()
    groups = {name: collection(name) for name in (STRUCTURE, DOCK, PROPS, LIGHTS, CAMERAS)}
    mats = {name: material(name, colour) for name, colour in COLOURS.items()}
    build_structure(groups[STRUCTURE], mats)
    build_dock(groups[DOCK], mats)
    build_props(groups[PROPS], mats)
    build_lighting(groups[LIGHTS], mats)
    cameras = build_cameras(groups[CAMERAS])
    append_probe_reference(Path(__file__).resolve().parent)
    configure_scene()
    previews = render_previews(out, cameras)
    blend_path, glb_path = export(out, list(groups.values()), cameras)

    important = [
        "HangarDoor_Left", "HangarDoor_Right", "Dock_Base", "Dock_Arm_L", "Dock_Arm_R",
        "Dock_Clamp_L", "Dock_Clamp_R", "Dock_Cable", "Dock_LightStrip", "LaunchRail_Carriage",
        "RepairArm", "InspectionLight", "Diagnostic_Screen", "Prop_BatteredCrate",
        "Prop_IrresponsibleCoffeeMug", *cameras.keys(),
    ]
    print("\n=== COSMOFORGE HANGAR 3 GENERATED ===")
    print(f"Blend: {blend_path}")
    print(f"GLB:   {glb_path}")
    print("Important objects:")
    for name in important:
        print(f"  - {name}")
    print("Animation-ready: doors, clamps, repair arm, inspection light, and launch rail carriage.")
    print("Mobile-optional objects carry cf_mobile_optional=true; lights/cameras may also be omitted at runtime.")
    print("Preview renders:")
    for path in previews:
        print(f"  - {path}")


if __name__ == "__main__":
    main()

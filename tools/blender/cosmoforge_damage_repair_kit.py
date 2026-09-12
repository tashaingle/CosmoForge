"""Generate modular damage, repair, and veteran details for CosmoForge probes.

Run with Blender:
    blender --background --python cosmoforge_damage_repair_kit.py

All kit geometry is authored around the existing probe origin. The base probe and
Hangar 3 are appended only for previews and never merged into the exported kit.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


LIGHT = "CosmoForge_Damage_Light"
MODERATE = "CosmoForge_Damage_Moderate"
HEAVY = "CosmoForge_Damage_Heavy"
REPAIRS = "CosmoForge_Repairs"
VETERAN = "CosmoForge_VeteranDetails"
HELPERS = "CosmoForge_AttachmentHelpers"
DEMO = "CosmoForge_DamageDemo"
REFERENCE = "CosmoForge_DamagePreview_Reference"

COLOURS = {
    "CF_Damage_Scorch": (0.055, 0.018, 0.012, 1.0),
    "CF_Damage_Metal": (0.16, 0.19, 0.20, 1.0),
    "CF_Damage_Wire": (0.86, 0.22, 0.045, 1.0),
    "CF_Damage_Glass": (0.02, 0.40, 0.55, 0.65),
    "CF_Repair_Patch": (0.28, 0.32, 0.31, 1.0),
    "CF_Repair_Tape": (0.95, 0.42, 0.06, 1.0),
    "CF_Repair_NewMetal": (0.68, 0.72, 0.70, 1.0),
    "CF_Repair_Weld": (0.40, 0.45, 0.46, 1.0),
    "CF_Veteran_Cyan": (0.00, 0.72, 1.00, 1.0),
    "CF_Veteran_Violet": (0.47, 0.08, 0.94, 1.0),
    "CF_Veteran_Gold": (1.00, 0.38, 0.04, 1.0),
}

ATTACHMENTS = {
    "Attach_Antenna": (0.0, 0.0, 0.95),
    "Attach_Lens": (0.0, -1.36, 0.12),
    "Attach_Panel_L": (-1.35, 0.0, 0.08),
    "Attach_Panel_R": (1.35, 0.0, 0.08),
    "Attach_BodyFront": (0.0, -0.98, 0.0),
    "Attach_BodySide_L": (-1.22, 0.0, 0.0),
    "Attach_BodySide_R": (1.22, 0.0, 0.0),
    "Attach_Thruster": (0.0, 1.25, 0.0),
    "Attach_Cargo": (0.0, 0.10, -0.95),
}

DEMO_CONFIGS = {
    "Probe_Fresh": [],
    "Probe_SlightlyBattered": ["Damage_Scratches_Light", "Damage_Dent_Small", "Damage_HeatStain"],
    "Probe_Repaired": ["Repair_PatchPlate_Small", "Repair_TapeCross", "Repair_MismatchedAntenna"],
    "Probe_Veteran": ["Damage_ScorchedPanel_L", "Damage_Dent_Large", "Damage_CrackedLens", "Repair_PatchPlate_Large", "Veteran_MissionSticker_02"],
    "Probe_HowAreYouStillFlying": ["Damage_BentPanel_R", "Repair_EmergencyClamp", "Damage_LooseWire_B", "Repair_MismatchedAntenna", "Repair_ReinforcedCorner", "Damage_Scratches_Heavy"],
}


def parse_output() -> Path:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--output-dir", default=str(Path(__file__).resolve().parent))
    return Path(parser.parse_args(args).output_dir).resolve()


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for group in list(bpy.data.collections):
        bpy.data.collections.remove(group)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)


def make_collection(name: str) -> bpy.types.Collection:
    group = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(group)
    return group


def move_to(obj, group) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    group.objects.link(obj)


def make_material(name, colour):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = colour
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = colour
    shader.inputs["Roughness"].default_value = 0.38
    if name not in {"CF_Repair_Tape", "CF_Damage_Glass"}:
        shader.inputs["Metallic"].default_value = 0.68
    if name == "CF_Damage_Glass":
        shader.inputs["Roughness"].default_value = 0.12
        transmission = shader.inputs.get("Transmission Weight") or shader.inputs.get("Transmission")
        if transmission:
            transmission.default_value = 0.34
    if name.startswith("CF_Veteran_"):
        emission = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        strength = shader.inputs.get("Emission Strength")
        if emission:
            emission.default_value = colour
        if strength:
            strength.default_value = 2.8
    return mat


def assign(obj, mat):
    if obj.type in {"MESH", "CURVE", "FONT"}:
        obj.data.materials.append(mat)


def finish(obj, bevel=0.0):
    if obj.type != "MESH":
        return obj
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Scar Edge Bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    return obj


def box(name, location, scale, group, mat, bevel=0.025, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    move_to(obj, group)
    assign(obj, mat)
    return finish(obj, bevel)


def cylinder(name, location, radius, depth, group, mat, rotation=(0, 0, 0), vertices=12, bevel=0.018):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    move_to(obj, group)
    assign(obj, mat)
    return finish(obj, bevel)


def sphere(name, location, scale, group, mat, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    move_to(obj, group)
    assign(obj, mat)
    return finish(obj)


def torus(name, location, major, minor, group, mat, rotation=(0, 0, 0), major_segments=16, minor_segments=6):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=major_segments, minor_segments=minor_segments, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    move_to(obj, group)
    assign(obj, mat)
    return finish(obj)


def tube(name, points, radius, group, mat):
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
    group.objects.link(obj)
    assign(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return obj


def text_mesh(name, text, location, size, group, mat, rotation=(math.pi / 2, 0, 0)):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.resolution_u = 1
    obj.data.extrude = 0.002
    move_to(obj, group)
    assign(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    obj["cf_replaceable_text"] = text
    return obj


def parent_keep_world(child, parent):
    transform = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = transform


def add_part(obj, area, severity, safe_with=()):
    obj["cf_modular_part"] = True
    obj["cf_attach_to"] = area
    obj["cf_severity"] = severity
    obj["cf_safe_with"] = list(safe_with)
    obj.hide_render = True
    obj.hide_viewport = True
    return obj


def descendants(root):
    result = [root]
    for item in root.children:
        result.extend(descendants(item))
    return result


def child(obj, root):
    parent_keep_world(obj, root)
    return obj


# -----------------------------------------------------------------------------
# Damage geometry

def build_damage(groups, m):
    light, moderate, heavy = groups[LIGHT], groups[MODERATE], groups[HEAVY]
    parts = []

    # Light damage occupies separate areas so it layers cleanly.
    small = add_part(sphere("Damage_Dent_Small", (0.72, -0.995, 0.36), (0.14, 0.025, 0.11), light, m["CF_Damage_Metal"]), "Attach_BodyFront", "light", ("Damage_Scratches_Light", "Damage_HeatStain"))
    large = add_part(sphere("Damage_Dent_Large", (1.225, -0.18, 0.26), (0.035, 0.30, 0.25), heavy, m["CF_Damage_Metal"], 2), "Attach_BodySide_R", "heavy", ("Damage_CrackedLens", "Repair_PatchPlate_Large"))
    parts += [small, large]

    scratches_light = add_part(tube("Damage_Scratches_Light", [(-0.68, -1.005, 0.28), (-0.48, -1.015, 0.12), (-0.25, -1.012, 0.23)], 0.012, light, m["CF_Damage_Metal"]), "Attach_BodyFront", "light", ("Damage_Dent_Small", "Repair_TapeCross"))
    scratches_heavy = add_part(tube("Damage_Scratches_Heavy", [(-1.205, -0.50, 0.45), (-1.22, -0.05, 0.18), (-1.22, 0.35, 0.40), (-1.21, 0.60, 0.05)], 0.018, light, m["CF_Damage_Metal"]), "Attach_BodySide_L", "light", ("Repair_ReinforcedCorner", "Damage_BentPanel_R"))
    parts += [scratches_light, scratches_heavy]

    heat = add_part(box("Damage_HeatStain", (0.58, 0.925, -0.22), (0.34, 0.018, 0.24), light, m["CF_Damage_Scorch"], 0.06), "Attach_Thruster", "light", ("Damage_Scratches_Light", "Damage_ImpactMark"))
    impact = add_part(torus("Damage_ImpactMark", (-0.66, -1.012, -0.25), 0.10, 0.022, light, m["CF_Damage_Scorch"], (math.pi / 2, 0, 0), 14, 5), "Attach_BodyFront", "light", ("Damage_Dent_Small", "Repair_PatchPlate_Small"))
    parts += [heat, impact]

    # Bent replacement antenna, with its pivot at the top hardpoint.
    antenna = add_part(tube("Damage_BentAntenna", [(0, 0, 0.95), (0.0, 0, 1.48), (0.20, -0.03, 1.82), (0.43, -0.08, 1.68)], 0.038, moderate, m["CF_Damage_Metal"]), "Attach_Antenna", "moderate", ("Damage_Scratches_Light", "Repair_PatchPlate_Small"))
    parts.append(antenna)

    crack = add_part(tube("Damage_CrackedLens", [(0.0, -1.372, 0.35), (-0.04, -1.378, 0.19), (0.10, -1.378, 0.08), (0.02, -1.378, -0.05)], 0.010, moderate, m["CF_Damage_Glass"]), "Attach_Lens", "moderate", ("Repair_TapeStrip_A", "Damage_Dent_Large"))
    chip = add_part(sphere("Damage_LensChip", (-0.18, -1.378, 0.27), (0.07, 0.015, 0.06), moderate, m["CF_Damage_Glass"]), "Attach_Lens", "moderate", ("Repair_TapeStrip_A",))
    parts += [crack, chip]

    for side, sign in (("L", -1), ("R", 1)):
        scorch = add_part(box(f"Damage_ScorchedPanel_{side}", (sign * 2.10, -0.092, 0.08), (0.40, 0.014, 0.25), moderate, m["CF_Damage_Scorch"], 0.07, (0, 0, sign * 0.04)), f"Attach_Panel_{side}", "moderate", ("Repair_PatchPlate_Small", f"Damage_BentPanel_{'R' if side == 'L' else 'L'}"))
        warped = child(box(f"Damage_ScorchedPanel_{side}_Warp", (sign * 2.48, -0.11, 0.30), (0.20, 0.025, 0.10), moderate, m["CF_Damage_Metal"], 0.025, (0.12, sign * 0.18, 0)), scorch)
        warped.hide_render = True
        warped.hide_viewport = True
        parts.append(scorch)

        bent = add_part(box(f"Damage_BentPanel_{side}", (sign * 2.62, -0.10, 0.34), (0.32, 0.045, 0.20), heavy, m["CF_Damage_Metal"], 0.035, (0.18, sign * 0.24, sign * 0.08)), f"Attach_Panel_{side}", "heavy", ("Repair_EmergencyClamp", "Damage_Scratches_Heavy"))
        parts.append(bent)

    wire_a = add_part(tube("Damage_LooseWire_A", [(-1.18, 0.12, -0.38), (-1.42, 0.10, -0.58), (-1.22, 0.10, -0.78), (-1.40, 0.08, -0.94)], 0.025, moderate, m["CF_Damage_Wire"]), "Attach_BodySide_L", "moderate", ("Damage_OpenAccessPanel", "Repair_CableTieBundle"))
    wire_b = add_part(tube("Damage_LooseWire_B", [(1.75, 0.03, -0.20), (2.00, -0.02, -0.42), (2.25, 0.02, -0.25)], 0.025, moderate, m["CF_Damage_Wire"]), "Attach_Panel_R", "moderate", ("Damage_BentPanel_R", "Repair_EmergencyClamp"))
    parts += [wire_a, wire_b]

    access = add_part(box("Damage_OpenAccessPanel", (-1.225, 0.20, 0.02), (0.025, 0.38, 0.30), heavy, m["CF_Damage_Scorch"], 0.035), "Attach_BodySide_L", "heavy", ("Damage_LooseWire_A", "Repair_CableTieBundle"))
    for index, (y, z, mat_name) in enumerate(((-0.02, 0.14, "CF_Damage_Wire"), (0.14, -0.06, "CF_Veteran_Cyan"), (0.34, 0.10, "CF_Repair_Weld")), 1):
        component = child(box(f"Damage_OpenAccessPanel_Component_{index}", (-1.258, y, z), (0.018, 0.08, 0.07), heavy, m[mat_name], 0.012), access)
        component.hide_render = component.hide_viewport = True
    parts.append(access)
    return parts


# -----------------------------------------------------------------------------
# Repair and veteran geometry

def build_repairs(groups, m):
    group = groups[REPAIRS]
    parts = []
    tape_specs = (
        ("Repair_TapeStrip_A", (-0.62, -1.025, 0.15), (0.30, 0.014, 0.06), 0.28),
        ("Repair_TapeStrip_B", (0.48, -1.025, -0.34), (0.26, 0.014, 0.06), -0.20),
    )
    for name, loc, scale, angle in tape_specs:
        parts.append(add_part(box(name, loc, scale, group, m["CF_Repair_Tape"], 0.018, (0, 0, angle)), "Attach_BodyFront", "repair", ("Damage_CrackedLens", "Damage_Scratches_Light")))
    cross = add_part(box("Repair_TapeCross", (-0.38, -1.028, -0.18), (0.24, 0.014, 0.055), group, m["CF_Repair_Tape"], 0.016, (0, 0, 0.65)), "Attach_BodyFront", "repair", ("Damage_CrackedLens", "Damage_Scratches_Light"))
    child(box("Repair_TapeCross_Second", (-0.38, -1.030, -0.18), (0.24, 0.014, 0.055), group, m["CF_Repair_Tape"], 0.016, (0, 0, -0.65)), cross).hide_render = True
    parts.append(cross)

    for name, loc, scale in (
        ("Repair_PatchPlate_Small", (0.74, -1.025, 0.36), (0.24, 0.018, 0.18)),
        ("Repair_PatchPlate_Large", (1.235, -0.12, 0.20), (0.022, 0.36, 0.30)),
    ):
        area = "Attach_BodyFront" if "Small" in name else "Attach_BodySide_R"
        plate = add_part(box(name, loc, scale, group, m["CF_Repair_Patch"], 0.045), area, "repair", ("Damage_ScorchedPanel_L", "Damage_Dent_Large"))
        for index, (a, b) in enumerate(((-1, -1), (-1, 1), (1, -1), (1, 1)), 1):
            if area == "Attach_BodyFront":
                bolt_loc = (loc[0] + a * scale[0] * 0.72, loc[1] - 0.025, loc[2] + b * scale[2] * 0.70)
                rotation = (math.pi / 2, 0, 0)
            else:
                bolt_loc = (loc[0] + 0.025, loc[1] + a * scale[1] * 0.72, loc[2] + b * scale[2] * 0.70)
                rotation = (0, math.pi / 2, 0)
            bolt = child(cylinder(f"{name}_Bolt_{index}", bolt_loc, 0.035, 0.025, group, m["CF_Repair_Weld"], rotation, 8, 0.008), plate)
            bolt.hide_render = bolt.hide_viewport = True
        parts.append(plate)

    for side, sign in (("L", -1), ("R", 1)):
        replacement = add_part(box(f"Repair_ReplacementPanel_{side}", (sign * 2.12, -0.10, 0.08), (0.54, 0.025, 0.34), group, m["CF_Repair_NewMetal"], 0.035), f"Attach_Panel_{side}", "repair", (f"Damage_ScorchedPanel_{side}", "Veteran_MissionSticker_01"))
        child(box(f"Repair_ReplacementPanel_{side}_Cell", (sign * 2.12, -0.135, 0.08), (0.42, 0.012, 0.24), group, m["CF_Veteran_Cyan"], 0.020), replacement).hide_render = True
        parts.append(replacement)

    clamp = add_part(torus("Repair_EmergencyClamp", (1.34, 0.0, 0.08), 0.27, 0.06, group, m["CF_Repair_Tape"], (0, math.pi / 2, 0), 14, 6), "Attach_Panel_R", "repair", ("Damage_BentPanel_R", "Damage_LooseWire_B"))
    parts.append(clamp)

    bundle = add_part(tube("Repair_CableTieBundle", [(-1.26, -0.18, -0.16), (-1.42, 0.02, -0.34), (-1.30, 0.28, -0.24)], 0.035, group, m["CF_Damage_Wire"]), "Attach_BodySide_L", "repair", ("Damage_OpenAccessPanel", "Damage_LooseWire_A"))
    child(torus("Repair_CableTieBundle_Tie", (-1.38, 0.02, -0.30), 0.10, 0.018, group, m["CF_Repair_Tape"], (0, math.pi / 2, 0), 12, 5), bundle).hide_render = True
    parts.append(bundle)

    mismatched = add_part(tube("Repair_MismatchedAntenna", [(0, 0, 0.95), (-0.06, 0, 1.30), (0.18, 0, 1.62), (0.10, 0, 2.02)], 0.050, group, m["CF_Repair_NewMetal"]), "Attach_Antenna", "repair", ("Repair_TapeCross", "Repair_PatchPlate_Small"))
    child(sphere("Repair_MismatchedAntenna_Tip", (0.10, 0, 2.05), (0.11, 0.11, 0.11), group, m["CF_Repair_Tape"]), mismatched).hide_render = True
    parts.append(mismatched)

    corner = add_part(box("Repair_ReinforcedCorner", (-1.16, -0.84, -0.68), (0.22, 0.18, 0.18), group, m["CF_Repair_Patch"], 0.06), "Attach_BodySide_L", "repair", ("Damage_Scratches_Heavy", "Damage_BentPanel_R"))
    parts.append(corner)

    seam = add_part(tube("Repair_WeldedSeam", [(0.22, -1.018, 0.70), (0.42, -1.018, 0.66), (0.62, -1.018, 0.70), (0.82, -1.018, 0.66)], 0.025, group, m["CF_Repair_Weld"]), "Attach_BodyFront", "repair", ("Damage_HeatStain", "Veteran_MissionSticker_03"))
    parts.append(seam)
    return parts


def build_veteran(groups, m):
    group = groups[VETERAN]
    parts = []
    sticker_data = (
        ("Veteran_MissionSticker_01", (-0.78, -1.026, 0.50), "CF_Veteran_Cyan", (0.10, 0.05)),
        ("Veteran_MissionSticker_02", (-0.52, -1.026, 0.49), "CF_Veteran_Gold", (0.08, 0.08)),
        ("Veteran_MissionSticker_03", (-0.28, -1.026, 0.50), "CF_Veteran_Violet", (0.11, 0.045)),
    )
    for name, loc, mat_name, scale in sticker_data:
        sticker = add_part(box(name, loc, (scale[0], 0.010, scale[1]), group, m[mat_name], 0.012, (0, 0, 0.08)), "Attach_BodyFront", "veteran", ("Repair_PatchPlate_Large", "Damage_Scratches_Light"))
        parts.append(sticker)

    warning = add_part(box("Veteran_WarningSticker", (0.46, -1.028, 0.55), (0.31, 0.010, 0.09), group, m["CF_Repair_Tape"], 0.014), "Attach_BodyFront", "veteran", ("Damage_Dent_Small",))
    child(text_mesh("Veteran_WarningSticker_Text", "MOSTLY UP", (0.46, -1.044, 0.55), 0.075, group, m["CF_Damage_Scorch"]), warning).hide_render = True
    parts.append(warning)

    mark = add_part(tube("Veteran_MaintenanceMark", [(-0.92, -1.035, -0.44), (-0.82, -1.035, -0.33), (-0.70, -1.035, -0.46), (-0.58, -1.035, -0.34)], 0.012, group, m["CF_Veteran_Cyan"]), "Attach_BodyFront", "veteran", ("Repair_TapeStrip_B",))
    parts.append(mark)

    lucky = add_part(cylinder("Veteran_LuckyBolt", (1.22, -0.62, -0.42), 0.075, 0.24, group, m["CF_Veteran_Gold"], (0, math.pi / 2, 0), 6, 0.018), "Attach_BodySide_R", "veteran", ("Damage_Dent_Large", "Repair_ReinforcedCorner"))
    child(cylinder("Veteran_LuckyBolt_Head", (1.35, -0.62, -0.42), 0.13, 0.08, group, m["CF_Veteran_Gold"], (0, math.pi / 2, 0), 6, 0.018), lucky).hide_render = True
    parts.append(lucky)
    return parts


def build_helpers(group):
    helpers = []
    for name, location in ATTACHMENTS.items():
        obj = bpy.data.objects.new(name, None)
        obj.empty_display_type = "ARROWS"
        obj.empty_display_size = 0.24
        obj.location = location
        obj["cf_attachment_helper"] = True
        group.objects.link(obj)
        helpers.append(obj)
    return helpers


def build_demo_presets(group):
    presets = []
    for name, enabled in DEMO_CONFIGS.items():
        obj = bpy.data.objects.new(name, None)
        obj.empty_display_type = "CUBE"
        obj.empty_display_size = 0.30
        obj["cf_demo_configuration"] = True
        obj["cf_enabled_parts"] = enabled
        group.objects.link(obj)
        presets.append(obj)
    return presets


# -----------------------------------------------------------------------------
# Preview references and exports

def append_collection(filepath: Path, collection_name: str, target: bpy.types.Collection):
    if not filepath.exists():
        return []
    before = set(bpy.data.objects)
    directory = str(filepath / "Collection") + "\\"
    try:
        bpy.ops.wm.append(directory=directory, filename=collection_name)
    except RuntimeError:
        return []
    appended = list(set(bpy.data.objects) - before)
    for obj in appended:
        for owner in list(obj.users_collection):
            owner.objects.unlink(obj)
        target.objects.link(obj)
        obj["cf_preview_only"] = True
    return appended


def point_at(obj, target=(0, 0, 0)):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def setup_preview(script_dir, group):
    probe_file = script_dir / "cosmoforge_probe.blend"
    hangar_file = script_dir / "cosmoforge_hangar3.blend"
    append_collection(probe_file, "CosmoForge_Probe", group)
    modules = append_collection(probe_file, "CosmoForge_Modules", group)
    # Keep only the probe's normal starter modules visible.
    for obj in modules:
        enabled = bool(obj.get("cf_default_enabled", False)) or obj.name == "Camera_Main_Lens"
        obj.hide_render = not enabled
        obj.hide_viewport = not enabled
    for collection_name in ("CosmoForge_Hangar_Structure", "CosmoForge_Hangar_Dock", "CosmoForge_Hangar_Props"):
        append_collection(hangar_file, collection_name, group)

    bpy.ops.object.light_add(type="AREA", location=(4.5, -4.5, 6.0))
    key = bpy.context.object
    key.name = "Preview_DamageKey"
    key.data.energy = 950
    key.data.shape = "DISK"
    key.data.size = 5.0
    point_at(key, (0, 0, 0))
    move_to(key, group)
    bpy.ops.object.light_add(type="AREA", location=(-3.5, -1.0, 2.8))
    rim = bpy.context.object
    rim.name = "Preview_DamageCyanRim"
    rim.data.energy = 380
    rim.data.color = (0.0, 0.48, 1.0)
    rim.data.size = 3.0
    point_at(rim, (0, 0, 0))
    move_to(rim, group)
    bpy.ops.object.camera_add(location=(7.0, -8.8, 4.7))
    camera = bpy.context.object
    camera.name = "Camera_DamageDemo"
    camera.data.lens = 58
    point_at(camera, (0, 0, 0.05))
    move_to(camera, group)
    bpy.context.scene.camera = camera
    return camera


def configure_scene():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        scene.view_settings.look = "Medium High Contrast"
    world = scene.world or bpy.data.worlds.new("DamageKit_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.003, 0.006, 0.012, 1.0)
    background.inputs["Strength"].default_value = 0.16


def set_visible_parts(parts, enabled_names):
    enabled = set(enabled_names)
    for part in parts:
        visible = part.name in enabled
        for obj in descendants(part):
            obj.hide_render = not visible
            obj.hide_viewport = not visible


def render_demo_previews(out, parts):
    paths = []
    for name, enabled in DEMO_CONFIGS.items():
        set_visible_parts(parts, enabled)
        # These variants replace the stock whip instead of intersecting it.
        stock_antenna = bpy.data.objects.get("Antenna_Whip")
        if stock_antenna:
            has_replacement = any(
                part_name in enabled
                for part_name in ("Damage_BentAntenna", "Repair_MismatchedAntenna")
            )
            stock_antenna.hide_viewport = has_replacement
            stock_antenna.hide_render = has_replacement
        path = out / f"cosmoforge_damage_{name.removeprefix('Probe_').lower()}.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        paths.append(path)
    set_visible_parts(parts, [])
    stock_antenna = bpy.data.objects.get("Antenna_Whip")
    if stock_antenna:
        stock_antenna.hide_viewport = False
        stock_antenna.hide_render = False
    return paths


def export_selected(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_materials="EXPORT",
        export_extras=True, export_cameras=False, export_lights=False,
    )


def export_individual(part, folder):
    path = folder / f"{part.name}.glb"
    export_selected(path, descendants(part))
    return path


def main():
    out = parse_output()
    individual = out / "damage_repair_individual"
    out.mkdir(parents=True, exist_ok=True)
    individual.mkdir(parents=True, exist_ok=True)
    reset_scene()
    groups = {name: make_collection(name) for name in (LIGHT, MODERATE, HEAVY, REPAIRS, VETERAN, HELPERS, DEMO, REFERENCE)}
    materials = {name: make_material(name, colour) for name, colour in COLOURS.items()}
    damage = build_damage(groups, materials)
    repairs = build_repairs(groups, materials)
    veteran = build_veteran(groups, materials)
    helpers = build_helpers(groups[HELPERS])
    demos = build_demo_presets(groups[DEMO])
    parts = [*damage, *repairs, *veteran]
    setup_preview(Path(__file__).resolve().parent, groups[REFERENCE])
    configure_scene()
    preview_paths = render_demo_previews(out, parts)

    blend_path = out / "cosmoforge_damage_repair_kit.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    pack_path = out / "cosmoforge_damage_repair_kit.glb"
    export_selected(pack_path, [obj for name in (LIGHT, MODERATE, HEAVY, REPAIRS, VETERAN, HELPERS, DEMO) for obj in groups[name].all_objects])
    individual_paths = [export_individual(part, individual) for part in parts]
    set_visible_parts(parts, [])
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    print("\n=== COSMOFORGE DAMAGE + REPAIR KIT GENERATED ===")
    print(f"Blend: {blend_path}")
    print(f"Pack GLB: {pack_path}")
    print("Generated modular parts:")
    for part in parts:
        print(f"  - {part.name} -> {part.get('cf_attach_to')} [{part.get('cf_severity')}]")
    print("Attachment helpers:")
    for helper in helpers:
        print(f"  - {helper.name}: {tuple(round(value, 3) for value in helper.location)}")
    print("Demo configurations:")
    for demo in demos:
        print(f"  - {demo.name}: {list(demo.get('cf_enabled_parts', []))}")
    print(f"Individual GLBs: {len(individual_paths)} in {individual}")
    print("Toggle a part root and all descendants together; the intact probe remains underneath.")
    print("Demo previews:")
    for path in preview_paths:
        print(f"  - {path}")


if __name__ == "__main__":
    main()

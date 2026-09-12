"""Generate CosmoForge's collectible finds, cargo cases, and Archive stand.

Run:
    blender --background --python cosmoforge_finds_pack.py

Optional output location:
    blender --background --python cosmoforge_finds_pack.py -- --output-dir C:/assets

The combined GLB keeps the museum-like showcase arrangement. Every collectible,
cargo case, and display stand is also exported as a centred individual GLB.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


COMMON = "CosmoForge_Finds_Common"
STRANGE = "CosmoForge_Finds_Strange"
CURSED = "CosmoForge_Finds_Cursed"
CASES = "CosmoForge_CargoCases"
DISPLAY = "CosmoForge_ArchiveDisplay"
PREVIEW = "CosmoForge_Finds_Preview"

COLOURS = {
    "CF_Find_Metal": (0.30, 0.34, 0.35, 1.0),
    "CF_Find_DarkMetal": (0.035, 0.050, 0.065, 1.0),
    "CF_Find_Glass": (0.05, 0.20, 0.26, 0.62),
    "CF_Find_Science": (0.70, 0.75, 0.72, 1.0),
    "CF_Find_Amber": (1.00, 0.39, 0.045, 1.0),
    "CF_Find_Violet": (0.45, 0.08, 0.92, 1.0),
    "CF_Find_Cursed": (0.12, 0.005, 0.17, 1.0),
    "CF_Find_Glow": (0.00, 0.72, 1.00, 1.0),
    "CF_CargoCase": (0.13, 0.16, 0.18, 1.0),
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


def new_collection(name: str) -> bpy.types.Collection:
    group = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(group)
    return group


def move_to(obj: bpy.types.Object, group: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    group.objects.link(obj)


def make_material(name: str, colour: tuple[float, float, float, float]) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = colour
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = colour
    shader.inputs["Roughness"].default_value = 0.36
    if name in {"CF_Find_Metal", "CF_Find_DarkMetal", "CF_CargoCase"}:
        shader.inputs["Metallic"].default_value = 0.72
    if name == "CF_Find_Glass":
        shader.inputs["Roughness"].default_value = 0.12
        transmission = shader.inputs.get("Transmission Weight") or shader.inputs.get("Transmission")
        if transmission:
            transmission.default_value = 0.38
    if name in {"CF_Find_Amber", "CF_Find_Violet", "CF_Find_Cursed", "CF_Find_Glow"}:
        emission = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        strength = shader.inputs.get("Emission Strength")
        if emission:
            emission.default_value = colour
        if strength:
            strength.default_value = 4.5 if name != "CF_Find_Cursed" else 2.6
    return mat


def assign(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.type in {"MESH", "CURVE", "FONT"}:
        obj.data.materials.append(mat)


def finish(obj: bpy.types.Object, bevel=0.0) -> bpy.types.Object:
    if obj.type != "MESH":
        return obj
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Collectible Edge Bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    return obj


def box(name, location, scale, group, mat, bevel=0.045, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    move_to(obj, group)
    assign(obj, mat)
    return finish(obj, bevel)


def cylinder(name, location, radius, depth, group, mat, rotation=(0, 0, 0), vertices=14, bevel=0.025):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    move_to(obj, group)
    assign(obj, mat)
    return finish(obj, bevel)


def sphere(name, location, scale, group, mat, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    move_to(obj, group)
    assign(obj, mat)
    return finish(obj)


def cone(name, location, radius1, radius2, depth, group, mat, rotation=(0, 0, 0), vertices=14):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    move_to(obj, group)
    assign(obj, mat)
    return finish(obj, 0.02)


def torus(name, location, major, minor, group, mat, rotation=(0, 0, 0), major_segments=20, minor_segments=8):
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


def label(name, body, location, size, group, mat, rotation=(math.pi / 2, 0, 0)):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
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
    obj["cf_replaceable_text"] = body
    return obj


def parent_keep_world(child: bpy.types.Object, parent: bpy.types.Object) -> None:
    transform = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = transform


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    result = [root]
    for child in root.children:
        result.extend(descendants(child))
    return result


def tag_root(root: bpy.types.Object, rarity: str, story: str) -> bpy.types.Object:
    root["cf_collectible_root"] = True
    root["cf_rarity"] = rarity
    root["cf_story"] = story
    return root


def child(obj: bpy.types.Object, root: bpy.types.Object) -> bpy.types.Object:
    parent_keep_world(obj, root)
    return obj


# -----------------------------------------------------------------------------
# Normal and science finds

def moon_rock(pos, group, m):
    x, y, z = pos
    root = tag_root(box("Find_MoonRock", (x, y, z), (0.58, 0.42, 0.10), group, m["CF_Find_DarkMetal"], 0.07), "common", "A lunar sample that has already requested its own chair.")
    rock = sphere("Find_MoonRock_Sample", (x, y, z + 0.40), (0.38, 0.30, 0.30), group, m["CF_Find_Science"], 1)
    rock.data.transform(Matrix.Diagonal((1.0, 0.82, 1.18, 1.0)))
    child(rock, root)
    child(box("Find_MoonRock_LabelPlate", (x, y - 0.43, z + 0.02), (0.30, 0.025, 0.07), group, m["CF_Find_Glow"], 0.015), root)
    return root


def mars_dust(pos, group, m):
    x, y, z = pos
    root = tag_root(cylinder("Find_MarsDust", (x, y, z + 0.28), 0.30, 0.62, group, m["CF_Find_Glass"], vertices=16), "common", "Mars, now available in one extremely non-refundable jar.")
    child(cylinder("Find_MarsDust_Dust", (x, y, z + 0.16), 0.24, 0.30, group, m["CF_Find_Amber"], vertices=16), root)
    child(cylinder("Find_MarsDust_Lid", (x, y, z + 0.62), 0.32, 0.12, group, m["CF_Find_Metal"], vertices=16), root)
    child(box("Find_MarsDust_Label", (x, y - 0.30, z + 0.34), (0.16, 0.018, 0.10), group, m["CF_Find_Science"], 0.015), root)
    return root


def meteor_fragment(pos, group, m):
    x, y, z = pos
    root = tag_root(sphere("Find_MeteorFragment", (x, y, z + 0.32), (0.42, 0.29, 0.55), group, m["CF_Find_DarkMetal"], 1), "common", "A dark fragment with a suspiciously expensive sparkle.")
    root.rotation_euler = (0.25, -0.32, 0.18)
    finish(root)
    for index, offset in enumerate(((-0.20, -0.20, 0.44), (0.18, -0.19, 0.18), (0.08, -0.24, 0.62)), 1):
        facet = box(f"Find_MeteorFragment_Facet_{index}", (x + offset[0], y + offset[1], z + offset[2]), (0.10, 0.025, 0.10), group, m["CF_Find_Metal"], 0.015, (0.1, 0.2, index * 0.4))
        child(facet, root)
    return root


def solar_sample(pos, group, m):
    x, y, z = pos
    root = tag_root(cylinder("Find_SolarSample", (x, y, z + 0.30), 0.34, 0.68, group, m["CF_Find_Metal"], vertices=16), "common", "A professionally contained amount of Sun. Allegedly.")
    child(cylinder("Find_SolarSample_Window", (x, y - 0.345, z + 0.30), 0.20, 0.035, group, m["CF_Find_Glass"], (math.pi / 2, 0, 0), 16, 0.01), root)
    child(sphere("Find_SolarSample_Glow", (x, y - 0.37, z + 0.30), (0.12, 0.03, 0.12), group, m["CF_Find_Amber"], 2), root)
    return root


def old_circuit(pos, group, m):
    x, y, z = pos
    root = tag_root(box("Find_OldCircuit", (x, y, z + 0.22), (0.52, 0.08, 0.36), group, m["CF_Find_DarkMetal"], 0.045, (0.12, 0.1, -0.08)), "common", "Its manufacturer went missing before its warranty did.")
    for index, (dx, dz) in enumerate(((-0.28, 0.16), (0.04, 0.18), (0.27, -0.10), (-0.12, -0.12)), 1):
        chip = box(f"Find_OldCircuit_Chip_{index}", (x + dx, y - 0.11, z + 0.22 + dz), (0.09, 0.035, 0.07), group, m["CF_Find_Metal"], 0.018)
        child(chip, root)
    trace = tube("Find_OldCircuit_Trace", [(x - 0.40, y - 0.14, z + 0.05), (x - 0.10, y - 0.14, z + 0.05), (x - 0.10, y - 0.14, z + 0.39), (x + 0.38, y - 0.14, z + 0.39)], 0.018, group, m["CF_Find_Glow"])
    child(trace, root)
    return root


def satellite_fragment(pos, group, m):
    x, y, z = pos
    root = tag_root(box("Find_SatelliteFragment", (x, y, z + 0.30), (0.54, 0.09, 0.40), group, m["CF_Find_Metal"], 0.04, (0.0, 0.18, -0.16)), "common", "Recovered orbital hardware. Mostly dead, occasionally blinking.")
    child(box("Find_SatelliteFragment_FadedMark", (x - 0.16, y - 0.13, z + 0.38), (0.20, 0.02, 0.07), group, m["CF_Find_Science"], 0.012, (0, 0.18, -0.16)), root)
    wire = tube("Find_SatelliteFragment_Wire", [(x + 0.36, y, z + 0.18), (x + 0.58, y - 0.04, z + 0.03), (x + 0.72, y, z + 0.18)], 0.025, group, m["CF_Find_Amber"])
    child(wire, root)
    return root


# -----------------------------------------------------------------------------
# Strange finds

def lucky_bolt(pos, group, m):
    x, y, z = pos
    root = tag_root(cylinder("Find_LuckyBolt", (x, y, z + 0.34), 0.18, 0.72, group, m["CF_Find_Amber"], vertices=6, bevel=0.035), "strange", "A normal bolt, except every probe insists it is lucky.")
    child(cylinder("Find_LuckyBolt_Head", (x, y, z + 0.76), 0.33, 0.18, group, m["CF_Find_Amber"], vertices=6, bevel=0.04), root)
    for index in range(4):
        ring = torus(f"Find_LuckyBolt_Thread_{index + 1}", (x, y, z + 0.12 + index * 0.13), 0.19, 0.025, group, m["CF_Find_Metal"], major_segments=12, minor_segments=6)
        child(ring, root)
    return root


def impossible_cube(pos, group, m):
    x, y, z = pos
    root = tag_root(box("Find_ImpossibleCube", (x, y, z + 0.38), (0.40, 0.40, 0.40), group, m["CF_Find_DarkMetal"], 0.065, (0.04, -0.08, 0.08)), "strange", "All six sides are the inside side. Engineering has declined comment.")
    for index, (loc, scale) in enumerate((
        ((x, y - 0.415, z + 0.08), (0.30, 0.018, 0.025)),
        ((x, y - 0.415, z + 0.68), (0.30, 0.018, 0.025)),
        ((x - 0.30, y - 0.415, z + 0.38), (0.025, 0.018, 0.30)),
        ((x + 0.30, y - 0.415, z + 0.38), (0.025, 0.018, 0.30)),
    ), 1):
        child(box(f"Find_ImpossibleCube_GlowLine_{index}", loc, scale, group, m["CF_Find_Violet"], 0.012), root)
    return root


def extra_star_photo(pos, group, m):
    x, y, z = pos
    root = tag_root(box("Find_ExtraStarPhoto", (x, y, z + 0.25), (0.48, 0.12, 0.35), group, m["CF_Find_Metal"], 0.06, (0.05, 0, -0.05)), "strange", "The catalogue says eight lights. The card continues to display nine.")
    child(box("Find_ExtraStarPhoto_Display", (x, y - 0.145, z + 0.25), (0.38, 0.025, 0.25), group, m["CF_Find_Glass"], 0.035), root)
    stars = [(-0.24, 0.12), (-0.08, -0.10), (0.09, 0.14), (0.24, -0.05), (0.0, 0.0)]
    for index, (dx, dz) in enumerate(stars, 1):
        star = sphere(f"Find_ExtraStarPhoto_Star_{index}", (x + dx, y - 0.18, z + 0.25 + dz), (0.025 if index < 5 else 0.045, 0.012, 0.025 if index < 5 else 0.045), group, m["CF_Find_Glow" if index < 5 else "CF_Find_Violet"], 1)
        child(star, root)
    return root


def radio_whisper(pos, group, m):
    x, y, z = pos
    root = tag_root(box("Find_RadioWhisper", (x, y, z + 0.30), (0.44, 0.34, 0.30), group, m["CF_Find_DarkMetal"], 0.08), "strange", "It receives no station, but somehow always sounds disappointed.")
    child(tube("Find_RadioWhisper_Antenna", [(x, y, z + 0.58), (x + 0.06, y, z + 1.02)], 0.025, group, m["CF_Find_Metal"]), root)
    child(torus("Find_RadioWhisper_Dial", (x - 0.17, y - 0.35, z + 0.30), 0.10, 0.035, group, m["CF_Find_Metal"], (math.pi / 2, 0, 0), 14, 6), root)
    signal = child(sphere("Find_RadioWhisper_SignalLight", (x + 0.20, y - 0.36, z + 0.37), (0.07, 0.025, 0.07), group, m["CF_Find_Violet"], 2), root)
    signal["cf_pulse_ready"] = True
    return root


def map_that_lies(pos, group, m):
    x, y, z = pos
    root = tag_root(box("Find_MapThatLies", (x, y, z + 0.22), (0.56, 0.08, 0.37), group, m["CF_Find_Metal"], 0.05, (0.10, 0.04, 0.06)), "strange", "Every route begins here. None agree where here is.")
    child(box("Find_MapThatLies_Display", (x, y - 0.105, z + 0.22), (0.46, 0.018, 0.28), group, m["CF_Find_Glass"], 0.025), root)
    paths = [
        [(-0.35, -0.18), (-0.10, 0.12), (0.34, -0.10)],
        [(-0.30, 0.18), (0.04, -0.13), (0.30, 0.16)],
    ]
    for index, path in enumerate(paths, 1):
        line = tube(f"Find_MapThatLies_Route_{index}", [(x + dx, y - 0.14, z + 0.22 + dz) for dx, dz in path], 0.018, group, m["CF_Find_Amber" if index == 1 else "CF_Find_Violet"])
        child(line, root)
    return root


def unknown_debris(pos, group, m):
    x, y, z = pos
    root = tag_root(cone("Find_UnknownDebris", (x, y, z + 0.38), 0.42, 0.18, 0.82, group, m["CF_Find_DarkMetal"], (0.24, 0.38, -0.16), 7), "strange", "Not one connector matches CosmoForge standards. A high bar, somehow.")
    child(torus("Find_UnknownDebris_Ring", (x + 0.05, y, z + 0.42), 0.34, 0.055, group, m["CF_Find_Violet"], (0.35, 0.1, 0.1), 15, 6), root)
    child(box("Find_UnknownDebris_Tab", (x + 0.38, y - 0.08, z + 0.26), (0.19, 0.08, 0.09), group, m["CF_Find_Metal"], 0.025, (0.2, 0.4, 0.1)), root)
    return root


# -----------------------------------------------------------------------------
# Cursed and very rare finds

def friend_void(pos, group, m):
    x, y, z = pos
    root = tag_root(sphere("Find_FriendShapedVoid", (x, y, z + 0.42), (0.38, 0.28, 0.52), group, m["CF_Find_Cursed"], 2), "cursed", "It is not friend-shaped from every angle. That has not helped.")
    # Make the silhouette subtly lopsided without dense displacement geometry.
    for vertex in root.data.vertices:
        if vertex.co.x > 0.1 and vertex.co.z > 0:
            vertex.co.x *= 1.23
            vertex.co.y *= 0.82
    ring = torus("Find_FriendShapedVoid_Containment", (x, y, z + 0.42), 0.62, 0.035, group, m["CF_Find_Violet"], (math.pi / 2, 0.18, 0), 24, 6)
    child(ring, root)
    for index, angle in enumerate((0.2, 2.3, 4.5), 1):
        node = sphere(f"Find_FriendShapedVoid_FrameNode_{index}", (x + math.cos(angle) * 0.62, y - 0.04, z + 0.42 + math.sin(angle) * 0.62), (0.07, 0.05, 0.07), group, m["CF_Find_Glow"], 1)
        child(node, root)
    return root


def wrong_earth(pos, group, m):
    x, y, z = pos
    root = tag_root(sphere("Find_WrongEarth", (x, y, z + 0.45), (0.42, 0.42, 0.42), group, m["CF_Find_Glass"], 2), "cursed", "Earth, except the Moon is duplicated and the daylight comes from nowhere useful.")
    for index, (dx, dz, scale) in enumerate(((-0.14, 0.10, (0.18, 0.05, 0.11)), (0.12, -0.10, (0.14, 0.05, 0.16))), 1):
        continent = sphere(f"Find_WrongEarth_Continent_{index}", (x + dx, y - 0.40, z + 0.45 + dz), scale, group, m["CF_Find_Science"], 1)
        child(continent, root)
    for index, (dx, dz) in enumerate(((0.58, 0.18), (-0.52, -0.24)), 1):
        moon = sphere(f"Find_WrongEarth_Moon_{index}", (x + dx, y, z + 0.45 + dz), (0.10, 0.10, 0.10), group, m["CF_Find_Science"], 1)
        child(moon, root)
    child(torus("Find_WrongEarth_StandRing", (x, y, z + 0.45), 0.55, 0.035, group, m["CF_Find_Violet"], (math.pi / 2, 0, 0), 20, 6), root)
    return root


def future_timestamp(pos, group, m):
    x, y, z = pos
    root = tag_root(box("Find_FutureTimestamp", (x, y, z + 0.30), (0.52, 0.30, 0.30), group, m["CF_Find_DarkMetal"], 0.07), "cursed", "The recorder insists tomorrow happened first.")
    display = child(box("Find_FutureTimestamp_Display", (x, y - 0.32, z + 0.34), (0.40, 0.025, 0.16), group, m["CF_Find_Glass"], 0.025), root)
    display["cf_dynamic_display"] = True
    digits = child(label("Find_FutureTimestamp_Text", "T+??:??", (x, y - 0.355, z + 0.34), 0.14, group, m["CF_Find_Amber"]), root)
    digits["cf_dynamic_text"] = True
    return root


def unscheduled_emotion(pos, group, m):
    x, y, z = pos
    root = tag_root(cylinder("Find_UnscheduledEmotion", (x, y, z + 0.38), 0.35, 0.80, group, m["CF_Find_Glass"], vertices=18), "cursed", "A serious laboratory vessel containing one feeling nobody approved.")
    child(cylinder("Find_UnscheduledEmotion_Base", (x, y, z + 0.02), 0.38, 0.16, group, m["CF_Find_DarkMetal"], vertices=18), root)
    child(cylinder("Find_UnscheduledEmotion_Lid", (x, y, z + 0.78), 0.38, 0.16, group, m["CF_Find_Metal"], vertices=18), root)
    glow = child(sphere("Find_UnscheduledEmotion_Contents", (x + 0.04, y, z + 0.40), (0.20, 0.17, 0.27), group, m["CF_Find_Violet"], 2), root)
    glow["cf_float_ready"] = True
    child(label("Find_UnscheduledEmotion_Label", "EMOTION?", (x, y - 0.36, z + 0.18), 0.10, group, m["CF_Find_Science"]), root)
    return root


def unknown_object(pos, group, m):
    x, y, z = pos
    root = tag_root(cone("Find_UnknownObject_01", (x, y, z + 0.42), 0.38, 0.16, 0.86, group, m["CF_Find_DarkMetal"], (0.12, 0.22, -0.10), 5), "very_rare", "No obvious purpose. No matching age. One part keeps turning toward the door.")
    child(torus("Find_UnknownObject_01_AncientRing", (x - 0.08, y, z + 0.45), 0.34, 0.045, group, m["CF_Find_Metal"], (0.25, 0.3, 0), 13, 5), root)
    eye = child(sphere("Find_UnknownObject_01_MovingLight", (x + 0.16, y - 0.29, z + 0.52), (0.07, 0.035, 0.07), group, m["CF_Find_Glow"], 1), root)
    eye["cf_motion_ready"] = True
    child(box("Find_UnknownObject_01_AsymmetricFoot", (x - 0.30, y + 0.10, z + 0.05), (0.22, 0.18, 0.08), group, m["CF_Find_Cursed"], 0.035, (0.05, 0.1, -0.2)), root)
    return root


# -----------------------------------------------------------------------------
# Cargo cases and Archive stand

def cargo_case(name, pos, accent_name, rarity, group, m):
    x, y, z = pos
    root = box(name, (x, y, z + 0.22), (0.70, 0.48, 0.22), group, m["CF_CargoCase"], 0.10)
    root["cf_case_root"] = True
    root["cf_rarity"] = rarity
    accent = m[accent_name]
    for side in (-1, 1):
        child(box(f"{name}_Corner_{'L' if side < 0 else 'R'}", (x + side * 0.58, y, z + 0.22), (0.08, 0.50, 0.24), group, accent, 0.035), root)
    lid = child(box(f"{name}_Lid", (x, y, z + 0.55), (0.66, 0.46, 0.11), group, m["CF_CargoCase"], 0.08), root)
    # Move the lid origin to its rear edge for opening animation.
    local_pivot = lid.matrix_world.inverted() @ Vector((x, y + 0.46, z + 0.55))
    lid.data.transform(Matrix.Translation(-local_pivot))
    lid.matrix_world.translation = Vector((x, y + 0.46, z + 0.55))
    lid["cf_animation_ready"] = "lid_hinge"
    child(box(f"{name}_Mark", (x, y - 0.49, z + 0.23), (0.24, 0.018, 0.05), group, accent, 0.012), root)
    return root


def archive_stand(pos, group, m):
    x, y, z = pos
    root = box("Archive_DisplayStand", (x, y, z + 0.18), (0.82, 0.65, 0.18), group, m["CF_Find_DarkMetal"], 0.10)
    root["cf_display_root"] = True
    root["cf_mount_point"] = [x, y, z + 0.72]
    child(cylinder("Archive_DisplayStand_Mount", (x, y, z + 0.41), 0.32, 0.16, group, m["CF_Find_Metal"], vertices=16), root)
    plate = child(box("Archive_DisplayStand_Nameplate", (x, y - 0.66, z + 0.18), (0.48, 0.025, 0.09), group, m["CF_Find_Glass"], 0.025), root)
    plate["cf_dynamic_display"] = True
    glow = child(cylinder("Archive_DisplayStand_UpLight", (x, y, z + 0.51), 0.18, 0.035, group, m["CF_Find_Glow"], vertices=16, bevel=0.01), root)
    glow["cf_light_hint"] = "soft_upward"
    return root


# -----------------------------------------------------------------------------
# Scene, export, and reporting

def point_at(obj: bpy.types.Object, target=(0, 0, 0)) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def preview_scene(group, m, centre=(0, 0, 0)):
    box("Preview_MuseumFloor", (0, 0.6, -0.18), (6.0, 4.2, 0.12), group, m["CF_Find_DarkMetal"], 0.08)
    box("Preview_MuseumBack", (0, 4.1, 2.0), (6.0, 0.10, 2.2), group, m["CF_CargoCase"], 0.06)
    label("Preview_Title", "RECOVERED OBJECTS // MOSTLY SAFE", (0, 3.95, 3.15), 0.34, group, m["CF_Find_Amber"])
    for name, location, energy, colour, size in (
        ("Preview_Key", (3.5, -4.0, 6.0), 1050, (0.93, 0.97, 1.0), 5.0),
        ("Preview_VioletFill", (-4.0, 0.0, 3.0), 500, (0.35, 0.03, 1.0), 3.0),
        ("Preview_AmberRim", (4.5, 2.0, 2.5), 420, (1.0, 0.18, 0.03), 2.5),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = colour
        light.data.shape = "DISK"
        light.data.size = size
        point_at(light, centre)
        move_to(light, group)
    bpy.ops.object.camera_add(location=(9.5, -12.5, 8.3))
    camera = bpy.context.object
    camera.name = "Camera_FindsShowcase"
    camera.data.lens = 55
    point_at(camera, (0, 0.8, 0.45))
    move_to(camera, group)
    bpy.context.scene.camera = camera


def configure_scene():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        scene.view_settings.look = "Medium High Contrast"
    world = scene.world or bpy.data.worlds.new("Finds_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.003, 0.006, 0.012, 1.0)
    background.inputs["Strength"].default_value = 0.16


def export_selected(path: Path, objects: list[bpy.types.Object]) -> None:
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


def export_individual(root: bpy.types.Object, folder: Path) -> Path:
    objects = descendants(root)
    original = root.matrix_world.copy()
    root.matrix_world.translation = Vector((0, 0, 0))
    path = folder / f"{root.name}.glb"
    export_selected(path, objects)
    root.matrix_world = original
    return path


def main():
    out = parse_output()
    individual_folder = out / "finds_individual"
    out.mkdir(parents=True, exist_ok=True)
    individual_folder.mkdir(parents=True, exist_ok=True)
    reset_scene()
    groups = {name: new_collection(name) for name in (COMMON, STRANGE, CURSED, CASES, DISPLAY, PREVIEW)}
    m = {name: make_material(name, colour) for name, colour in COLOURS.items()}

    roots = []
    common_positions = [(-4.2, 2.3, 0), (-2.55, 2.3, 0), (-0.9, 2.3, 0), (0.9, 2.3, 0), (2.55, 2.3, 0), (4.2, 2.3, 0)]
    common_builders = (moon_rock, mars_dust, meteor_fragment, solar_sample, old_circuit, satellite_fragment)
    roots.extend(builder(pos, groups[COMMON], m) for builder, pos in zip(common_builders, common_positions))

    strange_positions = [(-4.0, 0.6, 0), (-2.65, 0.6, 0), (-1.3, 0.6, 0), (0.1, 0.6, 0), (1.55, 0.6, 0), (3.1, 0.6, 0)]
    strange_builders = (lucky_bolt, impossible_cube, extra_star_photo, radio_whisper, map_that_lies, unknown_debris)
    roots.extend(builder(pos, groups[STRANGE], m) for builder, pos in zip(strange_builders, strange_positions))

    cursed_positions = [(-3.7, -1.25, 0), (-1.85, -1.25, 0), (0.0, -1.25, 0), (1.85, -1.25, 0), (3.7, -1.25, 0)]
    cursed_builders = (friend_void, wrong_earth, future_timestamp, unscheduled_emotion, unknown_object)
    roots.extend(builder(pos, groups[CURSED], m) for builder, pos in zip(cursed_builders, cursed_positions))

    case_specs = (
        ("CargoCase_Common", (-3.6, -3.0, 0), "CF_Find_Glow", "common"),
        ("CargoCase_Rare", (-1.2, -3.0, 0), "CF_Find_Amber", "rare"),
        ("CargoCase_Strange", (1.2, -3.0, 0), "CF_Find_Violet", "strange"),
        ("CargoCase_Cursed", (3.6, -3.0, 0), "CF_Find_Cursed", "cursed"),
    )
    case_roots = [cargo_case(name, pos, accent, rarity, groups[CASES], m) for name, pos, accent, rarity in case_specs]
    display_root = archive_stand((5.0, 0.55, 0), groups[DISPLAY], m)
    all_export_roots = [*roots, *case_roots, display_root]

    preview_scene(groups[PREVIEW], m)
    configure_scene()
    preview_path = out / "cosmoforge_finds_pack_preview.png"
    bpy.context.scene.render.filepath = str(preview_path)
    bpy.ops.render.render(write_still=True)
    blend_path = out / "cosmoforge_finds_pack.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    core_objects = [obj for name in (COMMON, STRANGE, CURSED, CASES, DISPLAY) for obj in groups[name].all_objects]
    pack_path = out / "cosmoforge_finds_pack.glb"
    export_selected(pack_path, core_objects)
    individual_paths = [export_individual(root, individual_folder) for root in all_export_roots]
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    print("\n=== COSMOFORGE FINDS PACK GENERATED ===")
    print(f"Blend: {blend_path}")
    print(f"Pack GLB: {pack_path}")
    print(f"Preview: {preview_path}")
    print("Collectible roots:")
    for root in roots:
        print(f"  - {root.name} [{root.get('cf_rarity')}] — {root.get('cf_story')}")
    print("Cargo cases and display:")
    for root in [*case_roots, display_root]:
        print(f"  - {root.name}")
    print("Animation-ready: every CargoCase_*_Lid; pulse/float/motion hints are stored as glTF extras.")
    print(f"Individual GLBs exported: {len(individual_paths)} to {individual_folder}")


if __name__ == "__main__":
    main()

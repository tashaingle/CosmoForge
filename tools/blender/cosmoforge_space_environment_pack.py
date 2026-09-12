"""Generate the CosmoForge stylised planets and reusable space environment pack.

Run with Blender 5.x:
    blender --background --python cosmoforge_space_environment_pack.py

The reusable assets are built at the origin. Mission scene objects are lightweight
configuration empties; preview renders temporarily arrange the real assets without
duplicating their geometry.
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector


PLANETS = "CosmoForge_Planets"
ASTEROIDS = "CosmoForge_Asteroids"
SPACE_FX = "CosmoForge_SpaceFX"
ORBIT_UI = "CosmoForge_OrbitUI"
SCENES = "CosmoForge_MissionScenes"
CAMERAS = "CosmoForge_MissionCameras"
LIGHTS = "CosmoForge_MissionLights"
REFERENCE = "CosmoForge_SpacePreview_Reference"

MATERIALS = {
    "CF_Earth": ((0.025, 0.18, 0.48, 1), 0.48, 0.0),
    "CF_EarthLand": ((0.16, 0.48, 0.20, 1), 0.65, 0.0),
    "CF_EarthCloud": ((0.82, 0.92, 1.0, 0.70), 0.35, 0.0),
    "CF_Moon": ((0.42, 0.44, 0.43, 1), 0.88, 0.0),
    "CF_MoonDark": ((0.16, 0.18, 0.19, 1), 0.95, 0.0),
    "CF_Mars": ((0.64, 0.13, 0.045, 1), 0.82, 0.0),
    "CF_MarsDark": ((0.22, 0.045, 0.025, 1), 0.9, 0.0),
    "CF_MarsDust": ((0.86, 0.24, 0.055, 0.36), 0.6, 0.0),
    "CF_Venus": ((0.72, 0.29, 0.045, 1), 0.6, 0.0),
    "CF_VenusCloud": ((1.0, 0.58, 0.13, 0.58), 0.48, 0.0),
    "CF_Asteroid": ((0.18, 0.15, 0.13, 1), 0.92, 0.08),
    "CF_AsteroidLight": ((0.33, 0.28, 0.22, 1), 0.88, 0.05),
    "CF_Sun": ((1.0, 0.31, 0.025, 1), 0.3, 0.0),
    "CF_Atmosphere": ((0.10, 0.56, 1.0, 0.19), 0.2, 0.0),
    "CF_Star": ((0.74, 0.88, 1.0, 1), 0.25, 0.0),
    "CF_UnknownGlow": ((0.35, 0.025, 0.78, 0.42), 0.22, 0.0),
    "CF_CursedSpace": ((0.72, 0.015, 0.52, 0.75), 0.24, 0.0),
    "CF_Orbit": ((0.0, 0.55, 0.85, 0.75), 0.3, 0.18),
    "CF_Target": ((1.0, 0.38, 0.04, 1), 0.32, 0.12),
}

EMISSIVE = {
    "CF_Sun": 5.0, "CF_Star": 4.0, "CF_UnknownGlow": 2.2,
    "CF_CursedSpace": 3.5, "CF_Orbit": 2.0, "CF_Target": 3.0,
}


def output_dir() -> Path:
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--output-dir", default=str(Path(__file__).resolve().parent))
    return Path(parser.parse_args(args).output_dir).resolve()


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)


def collection(name):
    group = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(group)
    return group


def move(obj, group):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    group.objects.link(obj)


def material(name, spec):
    colour, roughness, metallic = spec
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = colour
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = colour
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    if colour[3] < 1:
        shader.inputs["Alpha"].default_value = colour[3]
        mat.surface_render_method = "DITHERED"
    if name in EMISSIVE:
        emission = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        strength = shader.inputs.get("Emission Strength")
        if emission: emission.default_value = colour
        if strength: strength.default_value = EMISSIVE[name]
    return mat


def assign(obj, mat):
    if obj.type in {"MESH", "CURVE", "FONT"}:
        obj.data.materials.append(mat)


def finish(obj, bevel=0.0, smooth=False):
    if obj.type != "MESH": return obj
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel:
        mod = obj.modifiers.new("CosmoForge edge catch", "BEVEL")
        mod.width, mod.segments, mod.limit_method = bevel, 2, "ANGLE"
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for face in obj.data.polygons: face.use_smooth = smooth
    obj.select_set(False)
    return obj


def root(name, group, kind, costly=False):
    obj = bpy.data.objects.new(name, None)
    group.objects.link(obj)
    obj.empty_display_type = "SPHERE"
    obj.empty_display_size = 0.45
    obj["cf_asset_kind"] = kind
    obj["cf_optional_mobile"] = costly
    return obj


def parent(child, owner):
    child.parent = owner
    child.matrix_parent_inverse = owner.matrix_world.inverted()
    return child


def ico(name, radius, group, mat, subdivisions=2, scale=(1, 1, 1), loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name, obj.scale = name, scale
    move(obj, group); assign(obj, mat)
    return finish(obj, smooth=True)


def uv(name, radius, group, mat, segments=32, rings=16, scale=(1, 1, 1), loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name, obj.scale = name, scale
    move(obj, group); assign(obj, mat)
    return finish(obj, smooth=True)


def box(name, loc, scale, group, mat, rotation=(0, 0, 0), bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name, obj.scale = name, scale
    move(obj, group); assign(obj, mat)
    return finish(obj, bevel)


def torus(name, major, minor, group, mat, loc=(0, 0, 0), rotation=(0, 0, 0), segments=32):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
        major_segments=segments, minor_segments=6, location=loc, rotation=rotation)
    obj = bpy.context.object; obj.name = name
    move(obj, group); assign(obj, mat)
    return finish(obj, smooth=True)


def tube(name, points, radius, group, mat, cyclic=False):
    data = bpy.data.curves.new(name + "_Curve", "CURVE")
    data.dimensions, data.resolution_u, data.bevel_depth, data.bevel_resolution = "3D", 1, radius, 1
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points): point.co = (*co, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data); group.objects.link(obj); assign(obj, mat)
    return obj


def add_patch(owner, name, loc, scale, group, mat):
    patch = ico(name, 1, group, mat, 1, scale=scale, loc=loc)
    return parent(patch, owner)


def build_earth(group, mats):
    planet = root("Planet_Earth", group, "planet")
    parent(uv("Earth_Surface", 3.0, group, mats["CF_Earth"], 36, 20), planet)
    # Chunky continent suggestions positioned on the camera-facing hemisphere.
    for index, (loc, scale) in enumerate([
        ((-0.72, -2.87, 0.75), (0.72, .16, .64)), ((-.25, -2.98, .12), (.34, .11, .68)),
        ((.82, -2.84, .70), (.78, .14, .43)), ((1.22, -2.72, .05), (.35, .13, .62)),
        ((1.35, -2.67, -1.0), (.48, .13, .27)), ((-1.35, -2.62, -.35), (.38, .12, .55)),
    ]): add_patch(planet, f"Earth_Land_{index+1:02d}", loc, scale, group, mats["CF_EarthLand"])
    clouds = root("Earth_Clouds", group, "rotating_layer", True); parent(clouds, planet)
    for index, (loc, scale) in enumerate([
        ((-.95, -3.0, 1.45), (.8, .07, .16)), ((.65, -3.02, 1.25), (.65, .07, .13)),
        ((1.15, -2.91, -.55), (.7, .07, .15)), ((-.35, -3.08, -.85), (.55, .06, .12)),
    ]): parent(ico(f"Earth_CloudBand_{index+1:02d}", 1, group, mats["CF_EarthCloud"], 1, scale=scale, loc=loc), clouds)
    atmosphere = uv("Earth_Atmosphere", 3.11, group, mats["CF_Atmosphere"], 32, 16)
    atmosphere["cf_optional_mobile"] = True; parent(atmosphere, planet)
    return planet


def crater_disc(name, loc, scale, owner, group, dark):
    disc = ico(name, 1, group, dark, 1, scale=scale, loc=loc)
    parent(disc, owner)
    return disc


def build_moon(group, mats):
    planet = root("Planet_Moon", group, "planet")
    parent(ico("Moon_Surface", 2.75, group, mats["CF_Moon"], 3), planet)
    for index, (loc, size) in enumerate([
        ((-.75, -2.65, .85), .34), ((.65, -2.71, .42), .24), ((1.25, -2.42, -.45), .42),
        ((-.95, -2.52, -.75), .28), ((.08, -2.76, -1.15), .17), ((-.15, -2.78, .25), .14),
    ]): crater_disc(f"Moon_Crater_{index+1:02d}", loc, (size, .06, size*.72), planet, group, mats["CF_MoonDark"])
    foreground = root("Moon_CraterForeground", group, "foreground")
    parent(ico("Moon_ForegroundRock", .8, group, mats["CF_Moon"], 1, scale=(1.5, 1, .55)), foreground)
    parent(torus("Moon_ForegroundCraterRim", .46, .11, group, mats["CF_MoonDark"], rotation=(math.pi/2,0,0), segments=20), foreground)
    return planet, foreground


def build_mars(group, mats):
    planet = root("Planet_Mars", group, "planet")
    parent(ico("Mars_Surface", 2.9, group, mats["CF_Mars"], 3), planet)
    canyon = tube("Mars_Canyon", [(-1.65,-2.42,.5),(-.9,-2.76,.25),(-.25,-2.91,.38),(.4,-2.85,.12),(1.25,-2.58,.25)], .10, group, mats["CF_MarsDark"])
    parent(canyon, planet)
    parent(ico("Mars_PolarCap", 1, group, mats["CF_EarthCloud"], 1, scale=(.72,.12,.28), loc=(0,-2.58,1.38)), planet)
    props = []
    props.append(ico("Mars_Rock_A", .58, group, mats["CF_MarsDark"], 1, scale=(1.2,.8,.7)))
    props.append(ico("Mars_Rock_B", .43, group, mats["CF_Mars"], 1, scale=(.7,1.35,.8)))
    props.append(ico("Mars_Ridge", 1, group, mats["CF_MarsDark"], 1, scale=(2.1,.55,.42)))
    dust = ico("Mars_DustCloud", 1, group, mats["CF_MarsDust"], 2, scale=(2.4,.45,.75)); dust["cf_optional_mobile"] = True; props.append(dust)
    return planet, props


def build_venus(group, mats):
    planet = root("Planet_Venus", group, "planet")
    parent(uv("Venus_Surface", 2.95, group, mats["CF_Venus"], 32, 16), planet)
    for layer_index, offset in enumerate((0.0, .12), 1):
        layer = root(f"Venus_CloudLayer_{layer_index:02d}", group, "rotating_layer", True); parent(layer, planet)
        for band in range(-3, 4):
            radius = math.sqrt(max(.2, 3.02**2 - (band*.62)**2))
            ring = torus(f"Venus_Cloud_{layer_index}_{band+4}", radius, .10 + offset*.15, group,
                mats["CF_VenusCloud"], loc=(0,0,band*.62+offset), rotation=(math.pi/2,0,0), segments=30)
            ring.scale.x = 1.0 + (0.035 if (band+layer_index)%2 else -0.02)
            parent(ring, layer)
    atmosphere = uv("Venus_Atmosphere", 3.16, group, mats["CF_VenusCloud"], 32, 16)
    atmosphere["cf_optional_mobile"] = True; parent(atmosphere, planet)
    return planet


def distort_asteroid(obj, seed):
    rng = random.Random(seed)
    for vert in obj.data.vertices:
        factor = rng.uniform(.78, 1.18)
        vert.co *= factor
    obj.data.update()


def build_asteroids(group, mats):
    sources = []
    specs = [
        ("Asteroid_A", (.8,.58,.68), 11), ("Asteroid_B", (.58,.9,.55), 17),
        ("Asteroid_C", (1.0,.42,.44), 23), ("Asteroid_D", (.66,.62,1.0), 31),
        ("Asteroid_E", (.88,.72,.4), 47), ("Asteroid_Fragment_Small", (.3,.18,.42), 59),
    ]
    for i, (name, scale, seed) in enumerate(specs):
        asteroid = ico(name, 1, group, mats["CF_Asteroid" if i%2 else "CF_AsteroidLight"], 2 if i < 5 else 1, scale=scale)
        distort_asteroid(asteroid, seed); asteroid["cf_instance_source"] = True; sources.append(asteroid)
    field = root("AsteroidField_Demo", group, "instanced_demo", True)
    rng = random.Random(804)
    for i in range(38):
        source = sources[i % len(sources)]
        inst = bpy.data.objects.new(f"AsteroidField_Instance_{i+1:02d}", source.data)
        group.objects.link(inst); inst.parent = field
        inst.location = (rng.uniform(-10,10), rng.uniform(-8,8), rng.uniform(-5,5))
        inst.rotation_euler = tuple(rng.uniform(0, math.tau) for _ in range(3))
        size = rng.uniform(.22, .9); inst.scale = (size,size,size)
        inst["cf_shared_mesh_source"] = source.name
    return sources, field


def build_space_fx(group, mats):
    starfield = root("CF_Starfield", group, "starfield", True)
    rng = random.Random(2844)
    for i in range(120):
        direction = Vector((rng.uniform(-1,1), rng.uniform(-1,1), rng.uniform(-1,1))).normalized()
        position = direction * rng.uniform(24, 34)
        radius = .042 if i % 13 else .095
        star = ico(f"Star_{i+1:03d}", radius, group, mats["CF_Star"], 1, loc=position)
        parent(star, starfield)
    nebula = root("Space_Nebula_Volume", group, "optional_fx", True)
    parent(ico("Space_Nebula_Shell", 1, group, mats["CF_UnknownGlow"], 2, scale=(7,.25,3.4)), nebula)
    dust = root("Space_DistantDust", group, "optional_fx", True)
    for i in range(18):
        mote = ico(f"DistantDust_{i+1:02d}", .035, group, mats["CF_UnknownGlow"], 1,
            loc=(rng.uniform(-8,8), rng.uniform(5,13), rng.uniform(-5,5)))
        parent(mote, dust)
    unknown = root("Space_UnknownGlow", group, "optional_fx", True)
    parent(torus("UnknownGlow_Ring", 2.1, .055, group, mats["CF_UnknownGlow"], rotation=(math.pi/2,.18,.12)), unknown)
    cursed = root("Space_CursedDistortion", group, "cursed_fx", True)
    points = []
    for i in range(19):
        a = math.tau*i/19; r = 1.35 + .11*math.sin(a*5) + .06*math.cos(a*3)
        points.append((r*math.cos(a), 0, r*math.sin(a)))
    parent(tube("CursedDistortion_Ring", points, .035, group, mats["CF_CursedSpace"], True), cursed)
    impossible = root("Space_ImpossibleStar", group, "story_signal")
    parent(ico("ImpossibleStar_Core", .075, group, mats["CF_Star"], 1), impossible)
    parent(torus("ImpossibleStar_AlmostInvisibleRing", .14, .008, group, mats["CF_CursedSpace"], rotation=(math.pi/2,0,0), segments=18), impossible)
    return [starfield, nebula, dust, unknown, cursed, impossible]


def build_sun(group, mats):
    sun = root("Star_Sun", group, "star")
    parent(uv("Sun_Core", 2.2, group, mats["CF_Sun"], 28, 14), sun)
    corona = uv("Sun_Corona", 2.34, group, mats["CF_Target"], 28, 14); corona["cf_optional_mobile"] = True; parent(corona, sun)
    return sun


def build_orbit_ui(group, mats):
    assets = []
    assets.append(torus("Orbit_Path", 3.7, .018, group, mats["CF_Orbit"], rotation=(.25,0,0), segments=64))
    marker = root("Mission_TargetMarker", group, "mission_ui")
    parent(torus("TargetMarker_Ring", .42, .035, group, mats["CF_Target"], rotation=(math.pi/2,0,0), segments=24), marker)
    for a in range(0,360,90):
        rad=math.radians(a); parent(box(f"TargetMarker_Tick_{a}",(math.cos(rad)*.56,0,math.sin(rad)*.56),(.08,.025,.025),group,mats["CF_Target"],rotation=(0,-rad,0),bevel=.01),marker)
    assets.append(marker)
    ping = root("Signal_Ping", group, "mission_ui")
    for i in range(3): parent(torus(f"SignalPing_Ring_{i+1}", .28+i*.18, .018, group, mats["CF_Orbit"], rotation=(math.pi/2,0,0), segments=24), ping)
    assets.append(ping)
    beacon = root("Navigation_Beacon", group, "mission_ui")
    parent(ico("NavigationBeacon_Diamond", .27, group, mats["CF_Target"], 1, scale=(.6,.6,1.35)), beacon); assets.append(beacon)
    signal = root("Unknown_SignalMarker", group, "mission_ui")
    parent(torus("UnknownSignal_BrokenRing", .36, .025, group, mats["CF_CursedSpace"], rotation=(math.pi/2,.2,0), segments=17), signal)
    parent(ico("UnknownSignal_Point", .055, group, mats["CF_CursedSpace"], 1, loc=(.05,-.02,.02)), signal); assets.append(signal)
    return assets


def build_scene_presets(group):
    definitions = {
        "Scene_LEO": ("Planet_Earth", "cool", "near orbit"),
        "Scene_Lunar": ("Planet_Moon", "cool", "lunar approach"),
        "Scene_Mars": ("Planet_Mars", "warm", "mars approach"),
        "Scene_Venus": ("Planet_Venus", "amber", "venus atmosphere"),
        "Scene_AsteroidBelt": ("AsteroidField_Demo", "neutral", "sparse field"),
        "Scene_DeepSpace": ("CF_Starfield", "cool", "isolated"),
        "Scene_Cursed": ("Space_ImpossibleStar", "violet", "almost normal"),
    }
    presets=[]
    for name,(focus,light,mood) in definitions.items():
        item=root(name,group,"scene_preset")
        item["cf_focus_asset"],item["cf_light_preset"],item["cf_mood"] = focus,light,mood
        presets.append(item)
    return presets


def camera(name, loc, target, group, lens=50):
    data=bpy.data.cameras.new(name); data.lens=lens
    obj=bpy.data.objects.new(name,data); group.objects.link(obj); obj.location=loc
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()
    return obj


def light(name, kind, loc, colour, energy, group, size=5):
    data=bpy.data.lights.new(name,kind); data.color=colour; data.energy=energy
    if kind=="AREA": data.shape="DISK"; data.size=size
    obj=bpy.data.objects.new(name,data); group.objects.link(obj); obj.location=loc
    obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat("-Z","Y").to_euler()
    return obj


def setup_cameras_lights(camera_group, light_group):
    cams=[
        camera("Camera_WideMission",(10,-15,7),(0,0,0),camera_group,48),
        camera("Camera_ProbeHero",(6,-10,3),(0,0,.2),camera_group,62),
        camera("Camera_PlanetApproach",(12,-18,5),(0,0,0),camera_group,54),
        camera("Camera_Orbit",(0,-17,10),(0,0,0),camera_group,52),
        camera("Camera_StrangeEncounter",(7,-13,2.2),(0,0,.3),camera_group,68),
    ]
    lights=[
        light("Light_CoolKey","AREA",(-6,-7,9),(.72,.86,1),1050,light_group,6),
        light("Light_MarsBounce","AREA",(5,-1,2),(1,.18,.04),550,light_group,5),
        light("Light_VenusAmber","AREA",(-4,-2,5),(1,.48,.08),650,light_group,5),
        light("Light_DeepSpaceRim","AREA",(2,5,5),(.08,.35,1),800,light_group,4),
        light("Light_CursedAccent","POINT",(-2,-1,2),(.65,.01,.4),75,light_group),
    ]
    return cams,lights


def append_probe(script_dir, group):
    blend=script_dir/"cosmoforge_probe.blend"
    if not blend.exists(): return []
    imported=[]
    for cname in ("CosmoForge_Probe","CosmoForge_Modules"):
        with bpy.data.libraries.load(str(blend),link=False) as (source,target):
            target.collections=[cname] if cname in source.collections else []
        for coll in target.collections:
            if coll:
                group.children.link(coll); imported.extend(coll.all_objects)
    defaults={"Probe_Body","Probe_FrontPanel","Probe_RearSection","Probe_IDPlate","Probe_PanelLine_Top","Probe_PanelLine_Side","SolarPanel_Small_L","SolarPanel_Small_R","Antenna_Whip","Camera_Main","Camera_Main_Lens","Thruster_Dual","CargoPod_Small","BatteryPack"}
    for obj in imported:
        visible=obj.name in defaults
        obj.hide_viewport=not visible; obj.hide_render=not visible
    return imported


def descendants(owner):
    found=[owner]
    for child in owner.children: found.extend(descendants(child))
    return found


def set_tree_visible(owner, visible):
    for obj in descendants(owner): obj.hide_viewport=not visible; obj.hide_render=not visible


def configure_render(camera_obj):
    scene=bpy.context.scene; scene.camera=camera_obj
    scene.render.engine="BLENDER_EEVEE"
    scene.render.resolution_x,scene.render.resolution_y,scene.render.resolution_percentage=800,600,100
    scene.render.image_settings.file_format="PNG"
    scene.render.film_transparent=False
    world=bpy.data.worlds.new("CosmoForge Deep Space") if not bpy.data.worlds else bpy.data.worlds[0]
    scene.world=world; world.use_nodes=True
    world.node_tree.nodes["Background"].inputs["Color"].default_value=(.0015,.002,.006,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value=.035
    scene.view_settings.look="AgX - Medium High Contrast"


def render_previews(out, assets, probe, cameras, lights):
    # Asset names, position, scale, camera and light selections.
    configs={
        "leo":("Planet_Earth",(4,2,.2),1.18,"Camera_WideMission","Light_CoolKey"),
        "lunar":("Planet_Moon",(4.6,2,.1),1.1,"Camera_WideMission","Light_CoolKey"),
        "mars":("Planet_Mars",(4.2,2.8,.1),.92,"Camera_PlanetApproach","Light_MarsBounce"),
        "venus":("Planet_Venus",(4.2,2.8,.2),1.02,"Camera_PlanetApproach","Light_VenusAmber"),
        "asteroidbelt":("AsteroidField_Demo",(1,1,0),.62,"Camera_ProbeHero","Light_CoolKey"),
        "deepspace":("CF_Starfield",(0,0,0),1,"Camera_ProbeHero","Light_DeepSpaceRim"),
        "cursed":("Space_CursedDistortion",(4.2,2.8,.6),.48,"Camera_StrangeEncounter","Light_CursedAccent"),
    }
    starfield=assets["CF_Starfield"]
    for obj in assets.values(): set_tree_visible(obj,False)
    for lamp in lights: lamp.hide_render=True
    for item in probe:
        if not item.hide_viewport: item.hide_render=False
    paths=[]
    for label,(focus_name,loc,scale,cam_name,light_name) in configs.items():
        for obj in assets.values(): set_tree_visible(obj,False)
        focus=assets[focus_name]; set_tree_visible(focus,True); focus.location=loc; focus.scale=(scale,)*3
        if focus_name != "CF_Starfield": set_tree_visible(starfield,True)
        # The extra star is almost normal; add it to the cursed composition.
        if label=="cursed":
            impossible=assets["Space_ImpossibleStar"]; set_tree_visible(impossible,True); impossible.location=(-2,4,2.5)
        for lamp in lights: lamp.hide_render=lamp.name!=light_name
        cam=next(c for c in cameras if c.name==cam_name); bpy.context.scene.camera=cam
        path=out/f"cosmoforge_space_{label}.png"; bpy.context.scene.render.filepath=str(path)
        bpy.ops.render.render(write_still=True); paths.append(path)
        focus.location=(0,0,0); focus.scale=(1,1,1)
    for obj in assets.values(): set_tree_visible(obj,False)
    return paths


def select_export(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    unique=[]
    for obj in objects:
        if obj not in unique: unique.append(obj)
    state={obj:(obj.hide_viewport,obj.hide_render) for obj in unique}
    for obj in unique:
        obj.hide_viewport=False; obj.hide_render=False; obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format="GLB",use_selection=True,
        export_apply=True,export_extras=True,export_cameras=False,export_lights=False)
    for obj,(view,render) in state.items(): obj.hide_viewport=view; obj.hide_render=render
    return path


def export_asset(path, roots):
    objects=[]
    for item in roots: objects.extend(descendants(item))
    return select_export(path,objects)


def main():
    out=output_dir(); out.mkdir(parents=True,exist_ok=True)
    individual=out/"space_environment_individual"; individual.mkdir(exist_ok=True)
    reset_scene()
    groups={name:collection(name) for name in (PLANETS,ASTEROIDS,SPACE_FX,ORBIT_UI,SCENES,CAMERAS,LIGHTS,REFERENCE)}
    mats={name:material(name,spec) for name,spec in MATERIALS.items()}

    earth=build_earth(groups[PLANETS],mats)
    moon,moon_fg=build_moon(groups[PLANETS],mats)
    mars,mars_props=build_mars(groups[PLANETS],mats)
    venus=build_venus(groups[PLANETS],mats)
    sun=build_sun(groups[PLANETS],mats)
    asteroid_sources,field=build_asteroids(groups[ASTEROIDS],mats)
    spacefx=build_space_fx(groups[SPACE_FX],mats)
    orbit_assets=build_orbit_ui(groups[ORBIT_UI],mats)
    presets=build_scene_presets(groups[SCENES])
    cameras,lights=setup_cameras_lights(groups[CAMERAS],groups[LIGHTS])
    probe=append_probe(Path(__file__).resolve().parent,groups[REFERENCE])
    configure_render(cameras[0])

    roots=[earth,moon,moon_fg,mars,*mars_props,venus,sun,*asteroid_sources,field,*spacefx,*orbit_assets]
    assets={obj.name:obj for obj in roots}
    preview_paths=render_previews(out,assets,probe,cameras,lights)

    blend=out/"cosmoforge_space_environment_pack.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    reusable_objects=[obj for group_name in (PLANETS,ASTEROIDS,SPACE_FX,ORBIT_UI) for obj in groups[group_name].all_objects]
    pack=select_export(out/"cosmoforge_space_environment_pack.glb",reusable_objects)

    exports={
        "Earth":[earth], "Moon":[moon,moon_fg], "Mars":[mars,*mars_props], "Venus":[venus],
        "Asteroid_Set":[*asteroid_sources,field], "Space_FX":spacefx, "Orbit_UI":orbit_assets, "Sun":[sun],
    }
    individual_paths=[export_asset(individual/f"{name}.glb",items) for name,items in exports.items()]
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))

    print("\n=== COSMOFORGE SPACE ENVIRONMENT PACK GENERATED ===")
    print(f"Blend: {blend}\nPack GLB: {pack}")
    print("Reusable roots:")
    for obj in roots: print(f"  - {obj.name} [{obj.get('cf_asset_kind','mesh')}]")
    print("Mission presets:")
    for obj in presets: print(f"  - {obj.name}: {obj['cf_focus_asset']} / {obj['cf_light_preset']}")
    print("Cameras:"); [print(f"  - {obj.name}") for obj in cameras]
    print("Lights:"); [print(f"  - {obj.name}") for obj in lights]
    print("Complete generated object manifest (preview reference excluded):")
    for group_name in (PLANETS, ASTEROIDS, SPACE_FX, ORBIT_UI, SCENES, CAMERAS, LIGHTS):
        print(f"  [{group_name}]")
        for obj in sorted(groups[group_name].all_objects, key=lambda item: item.name):
            print(f"    - {obj.name} ({obj.type})")
    print("Individual exports:"); [print(f"  - {path}") for path in individual_paths]
    print("Preview renders:"); [print(f"  - {path}") for path in preview_paths]


if __name__ == "__main__":
    main()

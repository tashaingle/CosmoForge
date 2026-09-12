# Hangar 3 asset

Run `cosmoforge_hangar3.py` with Blender to rebuild the authoring file, GLB and camera previews. The generator looks for `cosmoforge_probe.blend` beside itself and uses that probe as a preview-only scale reference.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python cosmoforge_hangar3.py
```

The hangar GLB does **not** contain the probe. Load `cosmoforge_probe.glb` separately at the hangar origin `(0, 0, 0)` so its selected modules and scars remain independent.

## Collections

- `CosmoForge_Hangar_Structure`: room shell, segmented door, supports, vents and signage.
- `CosmoForge_Hangar_Dock`: cradle, moving clamps, charging cable and compact launch rail.
- `CosmoForge_Hangar_Props`: maintenance area and the small number of safety violations.
- `CosmoForge_Hangar_Lights`: four actual lights plus visible fixture meshes.
- `CosmoForge_Hangar_Cameras`: onboarding, return, inspection and launch framing.
- `CosmoForge_Probe_Reference`: only in the Blend preview; excluded from the GLB.

## Animation-ready objects

- Slide or fold `HangarDoor_Left` and `HangarDoor_Right` from their outer-edge origins.
- Rotate `Dock_Clamp_L` and `Dock_Clamp_R` away from the probe.
- Move `LaunchRail_Carriage` along local/world Y toward the door.
- Rotate `RepairArm` from its base and `InspectionLight_Arm` from its stand.
- Toggle `Light_Emergency_Red` and raise its energy for emergency scenes.

Custom glTF extras include `cf_category`, `cf_animation_ready`, `cf_mobile_optional`, and replaceable sign text.

## Simpler/mobile scenes

For a lighter mobile scene, hide objects carrying `cf_mobile_optional=true`, especially warning stripe details, the loose cable, overhead fixture meshes and the CosmoForge mark plate. Runtime cameras and Blender lights can be omitted if the game supplies its own. Keep the floor, back wall, door, cradle and one or two practical lights: those carry the silhouette and atmosphere.

The four main cameras all keep the probe near the visual centre. `Camera_Onboarding` is additionally rendered in portrait format as a mobile framing check.

## Materials

All materials are procedural and texture-free:

- `CF_HangarMetal`
- `CF_HangarDark`
- `CF_HangarPanel`
- `CF_HangarFloor`
- `CF_HangarWarning`
- `CF_HangarLight_Cyan`
- `CF_HangarLight_Amber`
- `CF_HangarGlass`

Change the colour values in `COLOURS` near the top of the generator, or edit the material Base Color directly in Blender. Keep cyan around the dock, amber on warnings, and neutral white above the probe so the room does not become one enormous cyan card.

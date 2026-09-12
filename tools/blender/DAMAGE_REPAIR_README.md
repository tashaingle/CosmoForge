# CosmoForge damage and repair kit

The kit is authored around the existing probe at `(0, 0, 0)`. Load `cosmoforge_probe.glb` and `cosmoforge_damage_repair_kit.glb` at the same transform, then hide every modular kit node by default.

Each main part carries these glTF extras:

- `cf_modular_part=true`
- `cf_attach_to`: the matching `Attach_*` helper
- `cf_severity`: light, moderate, heavy, repair or veteran
- `cf_safe_with`: tested combinations that use different visual zones

## Attachment areas

- Antennas: `Attach_Antenna`
- Lens cracks/chip: `Attach_Lens`
- Solar damage/replacements: `Attach_Panel_L` and `Attach_Panel_R`
- Stickers, tape, front scratches and small impact marks: `Attach_BodyFront`
- Access panel, cable bundle and heavy scratches: `Attach_BodySide_L`
- Large dent, lucky bolt and side patch: `Attach_BodySide_R`
- Heat stain: `Attach_Thruster`
- `Attach_Cargo` is included for future cargo scars and accessories

## Safe combinations

- Bent antenna + light front scratches
- Left scorched panel + front or right-side patch plate
- Cracked lens + either tape strip or tape cross
- Open access panel + loose wire A or cable-tie bundle
- Heavy veteran: bent panel R, emergency clamp, loose wire B, mismatched antenna, reinforced left corner and heavy left-side scratches

Avoid enabling the normal antenna and a replacement antenna simultaneously. A scorched overlay and replacement panel can be combined for a visibly repaired panel, but two full replacement/bent overlays on the same side should not both be enabled.

## Runtime toggling

In Three.js or another glTF engine, look up a node by its exact name, then set visibility on that node and every descendant. Child details such as bolts, cells, ties and antenna tips are parented to their modular root. The original probe mesh is never edited.

The named `Probe_*` empties store preview combinations in their `cf_enabled_parts` property. They are presets, not duplicate probe meshes.

## Individual exports

Every damage, repair and veteran root is also exported to `damage_repair_individual/`. The combined GLB includes all pieces, attachment helpers and demo preset empties. Hangar 3 and the base probe remain preview-only in the Blend file.

Run:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python cosmoforge_damage_repair_kit.py
```

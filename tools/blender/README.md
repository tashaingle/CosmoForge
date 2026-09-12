# CosmoForge modular probe generator

`cosmoforge_probe.py` procedurally creates the probe, a studio preview, and two output files:

- `cosmoforge_probe.blend`
- `cosmoforge_probe.glb`
- `cosmoforge_probe_preview.png` (studio sanity-check render)

No textures, add-ons, or downloaded assets are required.

## Run it

From this folder, with Blender installed and available on your PATH:

```powershell
blender --background --python cosmoforge_probe.py
```

To put the generated files somewhere else:

```powershell
blender --background --python cosmoforge_probe.py -- --output-dir C:/path/to/output
```

You can also open Blender, switch to the Scripting workspace, open the Python file, and press **Run Script**. By default the two files are written beside the script.

## Collections

- `CosmoForge_Probe` contains the permanent chassis, panel lines, ID plate, hardpoints and rear propulsion block.
- `CosmoForge_Modules` contains every interchangeable part and three optional personality-shape overlays.
- `CosmoForge_Damage` contains scar/damage overlays, all hidden by default.
- `CosmoForge_Preview` contains only the ground, camera and lights. It is deliberately excluded from the GLB.

## Toggleable module roots

Show one suitable object from each category and hide the alternatives:

- Solar: `SolarPanel_Small_L/R` or `SolarPanel_Large_L/R`
- Antenna: `Antenna_Whip`, `Antenna_Dish`, or `Antenna_Dual`
- Camera: `Camera_Main`, `Camera_Wide`, or `Sensor_Array`
- Propulsion: `Thruster_Small`, `Thruster_Dual`, or `IonDrive`
- Cargo: `CargoPod_Small` or `CargoPod_Large`
- Utility: `BatteryPack`, `ScienceModule`, and/or `CommunicationsBox`

Detail meshes are parented to their module roots. In a game importer, toggle the root and its descendants together. The exported nodes also include `cf_category`, `cf_toggleable`, and `cf_default_enabled` custom properties as glTF extras.

## Damage and personality

Objects in `CosmoForge_Damage` are independent overlays. Enable any combination of `Damage_BentAntenna`, `Damage_ScorchedPanel`, `Damage_CrackedLens`, `Damage_DentedBody`, `Damage_TapedRepair`, and `Damage_LooseWire`.

The personality objects are optional silhouette helpers:

- `Personality_ANXIOUS_CompactShell`: compact body; combine with whip antenna and small panels.
- `Personality_DRAMATIC_OversizedDish`: oversized dish; combine with large panels.
- `Personality_CHAOTIC_ImprovisedPod`: asymmetric bolt-on pod; use one large and one small panel for maximum questionable engineering.

Hide `Probe_Body` if using the anxious replacement shell. Dramatic and chaotic shapes are overlays/add-ons.

## Change the accent colour

Open the Material Properties for `CF_Accent` and change **Base Color**. This recolours the ID plate, highlighted utility pack, taped repair and improvised personality pod. For a scripted colour, edit `CF_Accent` in `MATERIAL_COLOURS` near the top of `cosmoforge_probe.py`; values are RGBA from `0.0` to `1.0`.

## Export behaviour

The authoring `.blend` is restored to a clean default probe after export. The GLB contains all base, module, personality and damage objects—even alternatives hidden in the Blend preview—so CosmoForge can address them by node name. Preview camera, lights and ground are not exported.

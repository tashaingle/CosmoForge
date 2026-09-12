# CosmoForge 3D assets

The 3D layer is optional presentation. `Craft`, missions, encounters, memories,
relationships and collections remain the source of truth. Failed or disabled 3D
scenes fall back to the existing SVG/CSS UI, so a model cannot stop gameplay.

## Runtime inventory

Browser files live under `public/models/`; editable `.blend` files and procedural
generators remain under `tools/blender/`.

| Runtime file | Approximate size | Purpose |
| --- | ---: | --- |
| `cosmoforge_probe.glb` | 827 KiB | Modular probe |
| `cosmoforge_hangar3.glb` | 1,172 KiB | Onboarding, launch and inspection |
| `cosmoforge_damage_repair_kit.glb` | 432 KiB | Toggleable scars and repairs |
| `cosmoforge_space_environment_pack.glb` | 653 KiB | Planets, asteroids and space effects |
| `finds/*.glb` | 19–64 KiB each | Cargo and Archive objects |

The full finds, individual damage and individual environment exports exist in
`tools/blender/`, but the game uses one combined damage/environment file and
individual finds to avoid loading an entire museum for one suspicious bolt.

## Code ownership

- `src/lib/3d-assets.ts`: every model path and scar/mission/loot mapping.
- `src/components/three/ProbeModel.tsx`: probe modules, skin, damage and movement.
- `Probe3D.tsx` / `ProbeCanvas.tsx`: standalone probe presentation.
- `MissionScene3D.tsx` / `MissionCanvas.tsx`: probe plus destination and encounter effects.
- `HangarScene3D.tsx` / `HangarCanvas.tsx`: Hangar 3, probe, doors and clamps.
- `Find3D.tsx` / `FindCanvas.tsx`: one discovered collectible.
- `ThreeSceneFallback.tsx`: error boundary and themed loading state.
- `three-quality.ts`: WebGL detection, high/low quality and 2D override.

Canvas implementations use `next/dynamic` with `ssr: false`. Drei caches loaded
GLBs; each component clones a scene before changing visibility or materials.

## Probe mapping

`SCAR_3D_OBJECTS` maps existing saved scars to Blender nodes:

| Scar ID | GLB nodes |
| --- | --- |
| `limps` | `Damage_BentPanel_R` |
| `afraid_of_dark` | `Damage_BentAntenna` |
| `venus_obsessed` | `Veteran_MissionSticker_03` |
| `rattles` | `Damage_LooseWire_A` |
| `overshares` | `Veteran_WarningSticker` |
| `lucky` | `Veteran_LuckyBolt` |
| `scorched` | `Damage_ScorchedPanel_R`, `Damage_HeatStain` |
| `quiet_now` | `Damage_CrackedLens` |

Voyage count adds existing visual history without new save fields: a sticker at
four voyages, patch plate at eight and welded seam at twelve. Keep names in
`PROBE_DEFAULT_MODULES`, `PROBE_ALTERNATE_MODULES` and this table stable when
re-exporting the Blender file.

## Missions and encounter effects

`getMissionEnvironment(missionId)` is the only destination mapper. It recognises
Earth/LEO, lunar, Mars, Venus, asteroid/belt, deep/outer and unknown/cursed IDs.
Mission progress changes visual distance and scale only; the voyage clock stays
in `src/lib/probe-voyage.ts`.

`MissionCanvas.tsx` relies on: `Planet_Earth`, `Earth_Clouds`,
`Earth_Atmosphere`, `Planet_Moon`, `Planet_Mars`, `Mars_DustCloud`,
`Planet_Venus`, `Venus_CloudLayer_01`, `Venus_CloudLayer_02`,
`Venus_Atmosphere`, `AsteroidField_Demo`, `CF_Starfield`,
`Space_DistantDust`, `Space_CursedDistortion`, `Space_ImpossibleStar` and
`Signal_Ping`. Extra-star, radio/signal and knock/cursed encounter IDs enable
small scene accents; choices stay in the transmission panel.

## Finds

`LOOT_3D_MODELS` maps each existing `LootId` to a file under
`public/models/finds/`. To add or replace one, copy `Find_Name.glb` there and
update that one map. Undiscovered Archive rows are disabled and do not mount or
download models. Debrief shows one focused model while retaining every cargo
card in text, preventing simultaneous heavy canvases.

## Hangar names

Runtime launch animation relies on `HangarDoor_Left`, `HangarDoor_Right`,
`Dock_Clamp_L` and `Dock_Clamp_R`. The probe remains a separate model positioned
at the cradle origin; it is never merged into the Hangar.

## Quality, motion and fallback

Automatic low quality is selected on narrow screens or devices reporting at
most four processors or 4 GB memory. Low mode uses pixel ratio 1, removes
shadows/contact shadows, hides decorative Hangar props, and hides expensive
atmosphere/dust. High mode caps pixel ratio around 1.5.

`prefers-reduced-motion` uses demand rendering and stops idle/environment
motion. Important information always remains in HTML. WebGL absence, `2d`
preference, or a caught model/render error restores the supplied `ProbeVisual`
or CSS fallback.

Development Control exposes `auto`, `high`, `low` and `Force 2D fallback` in
`DEV // CHEAT CONSOLE`. The setting uses local-only
`cosmoforge-3d-settings-v1`; it never syncs to Supabase. Existing scar, find,
launch and mission controls exercise the main 3D states.

## Replace and test a GLB

1. Preserve the object names listed above.
2. Replace its file under `public/models/`.
3. Hard-refresh to clear Drei’s in-memory GLTF cache.
4. Run `npm run typecheck` and `npm run build`.
5. Test high, low, reduced-motion and forced 2D modes.
6. With a production server on port 3200 and Chrome debugging on port 9222, run
   `$env:COSMOFORGE_VERIFY_URL='http://localhost:3200'; node tools/verify-local-3d.mjs`.
   It checks Canvas/model requests/errors and writes `tools/browser-control.png`.


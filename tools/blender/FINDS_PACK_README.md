# CosmoForge finds pack

`cosmoforge_finds_pack.py` generates the full finds library, four cargo cases, the Archive stand, a combined GLB, and centred individual GLBs in `finds_individual/`.

## Categories

- Common/science: Moon Rock, Mars Dust, Meteor Fragment, Solar Sample, Old Circuit and Satellite Fragment.
- Strange: Lucky Bolt, Impossible Cube, Extra Star Photo, Radio Whisper, Map That Lies and Unknown Debris.
- Cursed: Friend-Shaped Void, Wrong Earth, Future Timestamp and Unscheduled Emotion.
- Very rare: Unknown Object 01. Nobody has supplied a useful explanation. This is considered normal.

Each exact `Find_*` root carries `cf_collectible_root`, `cf_rarity`, and `cf_story` custom properties exported as glTF extras. Child nodes contain visual details that can be animated or hidden without replacing the collectible.

## Cargo cases

`CargoCase_Common`, `CargoCase_Rare`, `CargoCase_Strange`, and `CargoCase_Cursed` share one shape language. Their separate `*_Lid` child objects have rear-edge hinge origins and `cf_animation_ready="lid_hinge"`. Rotate a lid around local X for a cargo reveal.

## Animation hooks

- `Find_RadioWhisper_SignalLight`: pulse emission or scale.
- `Find_UnscheduledEmotion_Contents`: slowly float or wobble.
- `Find_UnknownObject_01_MovingLight`: slide subtly across the object.
- `Find_FutureTimestamp_Display` and `Find_FutureTimestamp_Text`: replaceable runtime display nodes.
- Cargo case lids: open from their hinge origins.

## Archive display

Place a centred individual find at the mount point above `Archive_DisplayStand`. `Archive_DisplayStand_Nameplate` is a separate dynamic display surface, and `Archive_DisplayStand_UpLight` is an emissive light hint rather than an expensive baked effect.

## Materials

The pack uses only simple procedural materials: `CF_Find_Metal`, `CF_Find_DarkMetal`, `CF_Find_Glass`, `CF_Find_Science`, `CF_Find_Amber`, `CF_Find_Violet`, `CF_Find_Cursed`, `CF_Find_Glow`, and `CF_CargoCase`. There are no external textures.

Run the generator with Blender:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python cosmoforge_finds_pack.py
```

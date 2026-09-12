# How to edit CosmoForge

This is the practical “I have not opened this project for six months” guide. Keep persisted IDs stable: changing a label is safe; changing an ID can orphan old save data.

## The three main areas

- Control (`src/components/control/ControlClient.tsx`) is the main game loop. Its smaller pieces live beside it in `src/components/control/`.
- Hangar (`/hangar`) currently reuses `src/components/hangar/HangarClient.tsx` so the existing builder, shop, marketplace and management tools remain available.
- Archive (`src/components/archive/ArchiveClient.tsx`) contains the Solar Passport, Codex and memorials.

## Change probe personalities

Edit `PERSONALITIES` in `src/lib/probe-personality.ts`. Each entry has a stable `id`, display label/vibe, ping templates, debrief openers and return lines. `{event}` inside a ping template is replaced with the generated voyage event. Add a new ID to `PersonalityId` in the same file before adding a new definition.

## Add a transmission

Add ordinary and interactive transmissions to `NORMAL_ENCOUNTERS` in `src/game/encounters/catalog.ts`. `src/game/encounters/engine.ts` schedules them; `src/game/transmissions.ts` exposes unresolved choices to the existing panel. The choice result stays on the original `ProbePing` (`resolvedChoiceId` and `resolutionText`) in `src/lib/types.ts`.

## Add a mission

Add the `MissionProfileId` and profile entry in `src/lib/orbital.ts`. Give it a target body and delta-v requirement. Add its player-facing objective briefing in `src/lib/mission-objectives.ts`. If it should be quick-launchable, add a preset in `src/lib/quick-launch.ts`. Finally, add its real-time character-voyage duration to `voyageDurationMs()` in `src/lib/probe-voyage.ts`.

Mission position/orbit math lives in `src/lib/orbital.ts`; real JPL body samples come through `src/lib/horizons.ts`. Do not add a second clock for the same mission.

## Add a discovery

Add a stable `LootId` and entry to `LOOT_CATALOG` in `src/lib/probe-loot.ts`. Then reference that ID from an encounter consequence in `src/game/encounters/catalog.ts`. Rarity controls debrief presentation; `creditValue` controls the one-time catalogue payout. If finding it should unlock a preset, edit `src/lib/probe-unlocks.ts`.

## Add a scar

Add a stable `ScarId` and entry to `SCARS` in `src/lib/probe-personality.ts`, then award it from an encounter consequence in `src/game/encounters/catalog.ts`. To make it visible, add a small conditional layer in `src/components/probe/ProbeVisual.tsx`. Scars are stored directly on the craft, so the visual does not need separate state.

## Change probe visuals

`src/components/probe/ProbeVisual.tsx` is a layered SVG. It reads the craft skin, voyage count, scars and cursed cargo. Safe changes include SVG paths, colour treatment, decals and additional conditionals based on existing craft fields. The small fleet portrait and large mission/debrief view use the same component.

Skin/livery definitions are in `src/lib/cosmetics.ts`; part definitions are in `src/lib/ship.ts`. The older 3D mission craft remains in `src/components/space/CraftModel.tsx`.

## Change colours and styles

Global Control/debrief styles and animations live in `src/app/globals.css`. Mission atmosphere classes are selected in `src/components/control/MissionStage.tsx` (`mission-mars`, `mission-moon`, `mission-venus`). Tailwind utility classes still style smaller details. Keep environmental colour local to the central stage rather than recolouring the entire interface.

## How mission timing works

`launchCraft()` in `src/lib/storage.ts` records a real `launchedAt`. `voyageDurationMs()` in `src/lib/probe-voyage.ts` converts the mission ID into a short real-world duration. `voyageProgress()` compares the current time with those values. `advanceVoyageStory()` deterministically generates every story beat whose timestamp has passed, which is why probes keep living while the browser is closed.

The detailed 3D mission screen also has a simulation timestamp (`lastSimMs`) for orbital display. Character voyage completion still uses wall-clock time.

## How local saves work

`src/lib/storage.ts` owns the primary fleet save: `cosmoforge-fleet-v1`. The complete `Craft` record, including its history and pings, is stored there. Other features currently have separate versioned keys: wallet (`economy.ts`), collection (`probe-loot.ts`), passport (`passport.ts`), objectives (`mission-objectives.ts`), daily state (`daily.ts`) and memorials (`probe-memorial.ts`).

Never rename a storage key or persisted ID without writing a migration. Keep newly added fields optional or supply defaults so old craft records continue to load.

## How Supabase sync works

`src/components/auth/AuthProvider.tsx` detects sessions and merges local/cloud data. `src/lib/cloud-fleet.ts` reads and writes rows; `src/lib/craft-mapper.ts` maps rows to crafts. Local writes happen first, and signed-in writes are then sent to Supabase.

At present cloud craft rows only include core design/flight information. Personality, pings, scars, cargo, relationship, lineage and debrief history are not mapped. Collection, passport, objectives, daily and memorial data are also local-only. Treat Supabase as partial cross-device sync until a versioned game-state column/migration is designed and deployed. Database setup is in `supabase/schema.sql`.

## Development/debug mode

`src/components/control/DevPanel.tsx` only renders when `process.env.NODE_ENV === "development"`. Start with `npm run dev`, open Control, then expand `DEV // CHEAT CONSOLE`. It can advance/complete a mission, create transmissions and encounters, add scars/finds/credits, or reset CosmoForge local keys. Resetting local save does not delete cloud rows. The panel produces no UI in a production build.

Use **Replay onboarding** to run the first-probe sequence without deleting the real fleet. The replay probe is deliberately local-only and is removed when the replay finishes. A truly clean test is still performed with an empty `cosmoforge-fleet-v1` and no `cosmoforge-onboarding-v1` flag.

## First-player onboarding

`src/components/onboarding/CosmoForgeEntry.tsx` waits for auth/cloud merging, then calls `shouldShowOnboarding()` from `src/lib/onboarding.ts`. Onboarding appears only when the fleet is empty, unless an `in_progress` onboarding save or development replay exists. Completion is stored under `cosmoforge-onboarding-v1`.

The screens and 75-second first mission live in `src/components/onboarding/FirstProbeOnboarding.tsx`; the three personality options live in `PersonalityChoice.tsx`. The short duration is selected by `craftVoyageDurationMs()` in `src/lib/probe-voyage.ts` only when `Craft.onboardingMission` is true. Normal mission durations are unchanged.

## How encounters work

The obvious place to browse and edit encounters is `src/game/encounters/catalog.ts`. The format is defined in `src/game/encounters/types.ts`; selection and consequences live in `src/game/encounters/engine.ts`; `src/game/transmissions.ts` is the small UI adapter. Do not hard-code encounter buttons in React.

A minimal flavour transmission looks like this:

```ts
{
  id: "unexpected_spoon",
  title: "Unscheduled cutlery",
  rarity: "common",
  type: "flavour",
  repeat: "repeatable",
  cooldownVoyages: 1,
  message: { default: "There is a spoon outside." },
}
```

A choice adds `choices`. Every choice has a stable `id`, button `label`, probe `response`, and optional `consequence`:

```ts
choices: [{
  id: "retrieve",
  label: "Retrieve spoon",
  response: { default: "Spoon secured. Soup remains theoretical." },
  consequence: {
    relationship: 1,
    lootId: "lucky_bolt",
    memory: { space_spoon_found: true },
    incrementMemory: { bad_ideas_survived: 1 },
  },
}]
```

Use `simple_choice` for a small decision and `risk_choice` when choices trade safety against damage or finds. Consequences can change relationship (including per personality), add one existing loot/scar ID, set plain memory, increment counters, or set story flags. Not every encounter needs a reward.

For a delayed result, put a `delayed` follow-up on its choice. For a multi-part transmission, put `followUps` on the encounter. `afterProgress` is a mission fraction from `0` to `1`:

```ts
followUps: [{
  id: "spoon_moved",
  afterProgress: 0.8,
  message: { default: "The spoon moved inside the sealed cargo bay." },
  consequence: { memory: { spoon_moved: true } },
}]
```

Personality text is optional: `message: { default: "Unknown object.", anxious: "Unknown object. No thank you." }`. Missing personalities use `default`. `{name}` becomes the probe's name.

Memory is the optional string/number/boolean object at `Craft.memory` in `src/lib/types.ts`. Require a flag with `memoryRequirements: [{ key: "space_spoon_found", equals: true }]`; counters can use `min`, and `absent: true` matches unset/false. Set values with `memory`, increment counters with `incrementMemory`, and add an ordered `memoryVariants` entry to reference them in later dialogue. The first matching variant wins. Keep keys descriptive and stable.

Repeat rules are `repeatable`, `once_per_probe`, and `once_per_save`. Add `cooldownVoyages` or `maxOccurrences` where useful. Per-probe history is `Craft.encounterHistory`; story seeds are strings in `Craft.storyFlags`; once-per-save history is localStorage key `cosmoforge_encounter_history_v1`. Do not rename shipped encounter IDs without a migration.

Rarity uses deliberately steep multipliers in `engine.ts`: common, uncommon, rare, strange and cursed. Optional `weight` adjusts probability within a rarity. Restrict events with `validMissions`, `validLocations`, and `minVoyages`. Selection is deterministic, so reload cannot reroll a flight. The `onboardingOnly` first encounter is never eligible for normal selection.

For a tiny multi-mission story, have one encounter set memory and require it from a later encounter. `repeating_signal` and `prelaunch_name` in `catalog.ts` are working examples. This is intentionally not a quest engine.

In development, open `DEV // CHEAT CONSOLE` on Control. It can trigger random common/rare/cursed events, trigger an exact ID, clear repeat history, and inspect the selected probe's memory, flags and history. Run `npm run test:encounters` after data or engine changes.

## Before committing an edit

Run `npm run lint`, `npm exec tsc -- --noEmit`, and `npm run build`. The project’s original baseline contains React 19 lint debt, documented in `COSMOFORGE_NOTES.md`; new or edited files should still be kept clean.
## Editing the 3D layer

Read `3D_ASSETS.md` for the complete map. The short version:

- Put runtime GLBs in `public/models/`, not inside React source folders.
- Edit paths and scar/mission/loot mappings in `src/lib/3d-assets.ts`.
- Edit probe movement and visible parts in `src/components/three/ProbeModel.tsx`.
- Edit mission composition in `MissionCanvas.tsx`; keep mission rules elsewhere.
- Edit Hangar door/clamp presentation in `HangarCanvas.tsx`.
- Edit high/low/2D behaviour in `three-quality.ts`.
- Preserve the `fallback` prop everywhere. Do not remove
  `src/components/probe/ProbeVisual.tsx` merely because WebGL works locally.

In development, `DEV // CHEAT CONSOLE` can force high, low or 2D rendering.
Its existing scar, find, launch and mission controls exercise the corresponding
3D states without changing normal timings.

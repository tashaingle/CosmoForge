# How to edit CosmoForge

This is the practical “I have not opened this project for six months” guide. Keep persisted IDs stable: changing a label is safe; changing an ID can orphan old save data.

## The three main areas

- Control (`src/components/control/ControlClient.tsx`) is the main game loop. Its smaller pieces live beside it in `src/components/control/`.
- Hangar (`/hangar`) currently reuses `src/components/hangar/HangarClient.tsx` so the existing builder, shop, marketplace and management tools remain available.
- Archive (`src/components/archive/ArchiveClient.tsx`) contains the Solar Passport, Codex and memorials.

## Change probe personalities

Edit `PERSONALITIES` in `src/lib/probe-personality.ts`. Each entry has a stable `id`, display label/vibe, ping templates, debrief openers and return lines. `{event}` inside a ping template is replaced with the generated voyage event. Add a new ID to `PersonalityId` in the same file before adding a new definition.

## Add a transmission

Ordinary timed transmissions come from `EVENT_SNIPPETS` and the personality templates in `src/lib/probe-voyage.ts`. Add a snippet with a `tag`, optional scar/loot ID and weight. Four deterministic beats are generated per voyage.

Occasional player choices are intentionally small. `src/game/transmissions.ts` turns unresolved `milestone` pings into choices and applies their consequences. Add a choice to `CHOICES`, extend `TransmissionChoice["id"]`, then handle it in `resolveTransmissionChoice()`. The choice result is stored on the original `ProbePing` (`resolvedChoiceId` and `resolutionText`) in `src/lib/types.ts`.

## Add a mission

Add the `MissionProfileId` and profile entry in `src/lib/orbital.ts`. Give it a target body and delta-v requirement. Add its player-facing objective briefing in `src/lib/mission-objectives.ts`. If it should be quick-launchable, add a preset in `src/lib/quick-launch.ts`. Finally, add its real-time character-voyage duration to `voyageDurationMs()` in `src/lib/probe-voyage.ts`.

Mission position/orbit math lives in `src/lib/orbital.ts`; real JPL body samples come through `src/lib/horizons.ts`. Do not add a second clock for the same mission.

## Add a discovery

Add a stable `LootId` and entry to `LOOT_CATALOG` in `src/lib/probe-loot.ts`. Then reference that ID from an event in `src/lib/probe-voyage.ts`. Rarity controls debrief presentation; `creditValue` controls the one-time catalogue payout. If finding it should unlock a preset, edit `src/lib/probe-unlocks.ts`.

## Add a scar

Add a stable `ScarId` and entry to `SCARS` in `src/lib/probe-personality.ts`, then award it from an event in `src/lib/probe-voyage.ts`. To make it visible, add a small conditional layer in `src/components/probe/ProbeVisual.tsx`. Scars are stored directly on the craft, so the visual does not need separate state.

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

## Before committing an edit

Run `npm run lint`, `npm exec tsc -- --noEmit`, and `npm run build`. The project’s original baseline contains React 19 lint debt, documented in `COSMOFORGE_NOTES.md`; new or edited files should still be kept clean.

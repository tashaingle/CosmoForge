# CosmoForge architecture notes

This document describes the current Control / Hangar / Archive project. It is written for someone comfortable with React, TypeScript, HTML, and CSS.

## The short version

CosmoForge is a Next.js 16 App Router application using React 19, TypeScript, Tailwind CSS 4, Zustand, Supabase, and React Three Fiber/Three.js. Most of the game is a browser-side React application. The browser's `localStorage` is the primary save; Supabase optionally mirrors fleet and wallet data for signed-in users and supplies public craft/share/marketplace data.

The home page is the focused Control experience. Management remains in Hangar, while collection and history live in Archive.

## What happens when the app first loads?

1. `src/app/layout.tsx` loads fonts and wraps every page in `AuthProvider` and `EphemerisProvider`.
2. `AuthProvider` reads the local wallet/fleet and checks for a Supabase session. When signed in it merges local and cloud crafts by `id`, preferring the newest `updatedAt`, and merges the wallet.
3. `/` renders `src/components/hangar/HangarClient.tsx`.
4. `HangarClient` loads the fleet from `localStorage`, catches up every in-flight craft using wall-clock time, creates the away report, and renders all home panels.
5. `ProbeVoyagePanel` advances mission stories. It deterministically creates any pings, loot, and scars whose time has passed, then saves changed craft records.
6. The JPL Horizons provider fetches `/api/ephemeris` for real-ish body positions. The sky feed separately fetches `/api/sky-feed` for JPL close approaches and NASA DONKI solar events.

## Routes

- `/` — current all-in-one hangar/home dashboard.
- `/design/[id]` — edit a custom craft.
- `/launch/[id]` — choose and launch a mission for a designed craft.
- `/mission/[id]` — 3D mission view and mission objectives.
- `/auth/callback` — finishes Supabase magic-link sign-in.
- `/d/[token]` and `/share/[token]` — shared debrief/craft pages.
- `/s/[id]` — short share page backed by Supabase.
- `/api/ephemeris` — cached JPL Horizons body-position bundle.
- `/api/sky-feed` — cached JPL CAD and NASA DONKI event feed.
- `/api/shares` and `/api/shares/[id]` — create/read Supabase mission shares.

## Where fleet data is stored

The canonical runtime model is `Craft` in `src/lib/types.ts`. The complete local fleet is stored under `cosmoforge-fleet-v1` by `src/lib/storage.ts`. A `Craft` contains design parts, mission/orbit timestamps, personality, pings, scars, cargo, relationship history, last debrief, lineage, and memorial-related fields. This is good in one respect: probe history is not duplicated into a separate character record.

When a user is signed in, `upsertCraft()` writes locally immediately and starts an asynchronous Supabase upsert. `src/lib/craft-mapper.ts` converts between the TypeScript object and the `crafts` database row. Important limitation: the current row mapper only syncs core design/flight fields. Personality, pings, scars, cargo, relationship, lineage and debrief history remain local and are lost when a cloud-only row replaces a craft on another device. Cloud sync is therefore only a partial mirror, not a complete game save.

`selectedCraftId` exists in `FleetState`, but the old homepage does not use it as a proper shared selection model; most panels reload their own slices of the fleet.

## How launching a probe works

There are two paths:

- Custom launch: `createCraft()` creates a design with starter parts; `/design/[id]` edits it; `/launch/[id]` calls `launchCraft()`.
- Quick launch: `src/lib/quick-launch.ts` chooses a personality preset, creates/configures a craft, and launches it in one operation. It also supports odd presets, deliberate bad launches, and descendants.

`launchCraft()` checks computed part statistics, creates orbital elements through `src/lib/orbital.ts`, records `launchedAt`/`lastSimMs`, calculates `expectedReturnAt`, changes status to `inflight`, and saves. The current launch UI is a conventional form/action rather than an event sequence.

## How missions progress

There are two related clocks:

- The visual/orbital simulation in `src/lib/orbital.ts` and `MissionClient` advances the displayed position.
- The character voyage in `src/lib/probe-voyage.ts` uses real elapsed wall-clock time. Durations are deliberately game-sized (for example, LEO is 3 minutes and lunar is 12 minutes).

`advanceVoyageStory()` delegates normal mission events to `src/game/encounters/engine.ts`. Short flights receive zero or one encounter, normal flights one, and long flights one or two. Selection is deterministic from probe, voyage and slot, so reopening cannot reroll an encounter. Location, voyage count, memory, rarity and repeat rules filter the library before weighted selection. At the end it creates a return ping and marks the craft ready. Deliberately bad launches retain their deterministic chance to go silent near the end.

Mission objectives in `src/lib/mission-objectives.ts` are a second progression/reward system used on the mission page. Their progress is stored separately in `cosmoforge-objectives-v1`.

## Returning and debriefing

`returnProbe()` in `src/lib/probe-voyage.ts` verifies readiness, applies relationship changes, builds a `VoyageDebrief`, changes the craft to `complete`, and stores the debrief on the craft. `DebriefModal` then catalogues loot once and pays credits once, unlocks eligible presets, and optionally analyses cargo or shares the debrief.

The existing implementation preserves the important data correctly, but presentation and reward mutation are mixed inside a modal effect. This makes the flow harder to reason about and is the main target for a staged debrief refactor.

## Local data versus cloud data

Local-only `localStorage` data:

- fleet and full probe history: `cosmoforge-fleet-v1`
- commander name: `cosmoforge-commander-name`
- wallet: `cosmoforge-wallet-v1`
- discoveries/claimed debriefs: `cosmoforge-collection-v1`
- daily state: `cosmoforge-daily-v1`
- objective progress: `cosmoforge-objectives-v1`
- Solar Passport: managed by `src/lib/passport.ts`
- memorials and last messages: `cosmoforge-memorials-v1`, `cosmoforge-last-messages-v1`
- last home visit: `cosmoforge-last-home-ms`

Cloud-synced data:

- signed-in craft identity, parts, status, mission/orbit timing, notes, commander and skin (not full probe history)
- commander profile name
- wallet credits, unlocked/equipped skin, and claimed wallet rewards
- public mission shares
- marketplace listings/sales

The collection, passport, daily state, objective state, memorial list, and last-message list are not currently cloud-synced. Some information overlaps with a synced craft (for example scars and `lastDebrief`), but the separate collection/claim ledger does not. This can produce different archive/reward state on another device.

## What Supabase currently does

`src/lib/supabase.ts` creates the browser client from public environment variables. `AuthProvider` handles magic-link sessions and sync orchestration. `src/lib/cloud-fleet.ts` reads/writes crafts and profile wallet data. The SQL in `supabase/schema.sql` defines:

- `crafts`, with owner write access and public read access for in-flight map markers;
- `profiles`, containing commander name and wallet/cosmetic fields;
- `mission_shares`, publicly readable/creatable share snapshots;
- marketplace listing, sales, ledger tables, and an atomic purchase RPC with a 25% fee.

The checked-in SQL craft status constraint only lists `design`, `inflight`, and `complete`, while the TypeScript model also uses `lost` and `retired`. Unless the deployed database has a newer manual change, syncing either newer status can fail. This is a concrete schema drift risk.

## Other major systems

- Parts/stat model: `src/lib/ship.ts`; visual mapping: `src/lib/craft-mapper.ts` and `src/components/space/CraftModel.tsx`.
- Mission/orbit definitions: `src/lib/orbital.ts`; body catalogue: `src/lib/bodies.ts`.
- Personalities and scars: `src/lib/probe-personality.ts`.
- Loot/discoveries/collection: `src/lib/probe-loot.ts`.
- Relationships: `src/lib/probe-relationship.ts`.
- Titles/unlocks/analysis/lineage support: `src/lib/probe-titles.ts`, `probe-unlocks.ts`, `probe-analysis.ts`, and `quick-launch.ts`.
- Wallet/rewards: `src/lib/economy.ts`. It starts locally with 500 credits and tracks launch/objective claims.
- Cosmetics: definitions in `src/lib/cosmetics.ts`, UI in `CosmeticsShop.tsx`, selected skin stored both on the wallet (equipped default) and each craft (actual livery).
- Marketplace: `src/lib/marketplace-api.ts` plus `MarketplacePanel.tsx`; backed by Supabase.
- Solar Passport: `src/lib/passport.ts` plus `SolarPassportPanel.tsx`.
- Codex/collection and memorials: `CodexPanel.tsx`, `MemorialPanel.tsx`, `probe-loot.ts`, and `probe-memorial.ts`.
- Live astronomy: static events in `sky-events.ts`; live JPL CAD/NASA DONKI in `jpl-feed.ts` and `/api/sky-feed`; JPL Horizons ephemerides in `horizons.ts` and `/api/ephemeris`.

## Most important files

- `src/lib/types.ts` — the probe/fleet data contract.
- `src/lib/storage.ts` — local fleet persistence and custom launch transition.
- `src/lib/probe-voyage.ts` — offline character story, pings, scars, return, debrief.
- `src/lib/quick-launch.ts` — presets and one-tap launches.
- `src/lib/orbital.ts` — missions and orbital calculations.
- `src/components/hangar/HangarClient.tsx` — current homepage composition.
- `src/components/mission/MissionClient.tsx` — detailed mission experience.
- `src/components/auth/AuthProvider.tsx` and `src/lib/cloud-fleet.ts` — authentication/cloud merging.
- `src/app/globals.css` — global presentation.

## Safe places to edit

- Text/personality lines: `src/lib/probe-personality.ts`.
- Discovery names and flavour: `src/lib/probe-loot.ts` (keep IDs stable once saves exist).
- Quick-launch flavour/presets: `src/lib/quick-launch.ts` (reuse valid mission and part IDs).
- Cosmetic definitions: `src/lib/cosmetics.ts` (keep existing IDs stable).
- Static sky-event flavour: `src/lib/sky-events.ts`.
- UI components and Tailwind classes under `src/components/` are generally safe when their props and state transitions are preserved.

Edit `types.ts`, `storage.ts`, `craft-mapper.ts`, `cloud-fleet.ts`, `orbital.ts`, or the Supabase schema cautiously: changes there affect old saves, cloud rows, mission math, or all routes. Never rename persisted IDs or localStorage keys without a migration.

## Unnecessarily complicated or fragile areas

- The homepage owns too many unrelated responsibilities and is visually a long sequence of similar cards.
- Several panels independently poll and reload `localStorage`; there is no single reactive game-state owner. Zustand is installed but unused.
- Persistence and game mutations are scattered. Some functions save locally, some also fire-and-forget cloud writes, and debrief rewards mutate collection and wallet inside UI effects.
- `storage.ts` uses runtime `require()` calls to avoid circular dependencies with voyage/daily modules. That is a strong sign the launch orchestration boundary needs simplifying.
- Fleet cloud writes are fire-and-forget and errors are normally only logged, so the UI can claim a local success while the cloud is stale.
- Local/cloud coverage is partial, allowing archive and reward history to disagree across devices.
- The Supabase schema status constraint appears behind the TypeScript model (`lost`/`retired`).
- Quick-launch, mission objectives, daily rewards, unlocks, and live-event boosts all touch reward logic through separate paths. The systems work, but the ownership boundary is difficult to follow.
- Some large modules (`MissionClient`, `HangarClient`, `SolarSystemScene`, `TexturedCelestial`, `mission-objectives`, `quick-launch`) combine data rules and substantial rendering/configuration.
- The baseline build and strict type check pass, but lint currently reports 35 errors and 13 warnings, mostly React 19 purity/effect rules plus a few Next.js link and unused-value issues. These pre-date the redesign and should be reduced incrementally without pretending the baseline was clean.
- The repository contains visibly mojibaked punctuation in terminal output (for example em dashes/quotes rendered as odd byte sequences). This may be terminal decoding rather than file corruption, so edits should preserve UTF-8 and visual browser output should be checked.

## Refactor direction

Keep `Craft` as the central probe record and keep the deterministic voyage functions. Introduce one understandable Control-screen state boundary that loads/ticks the fleet and passes data/actions to small visual components. Extract pure reward/debrief preparation from UI effects. Build Hangar and Archive as focused views without moving every file. A small transmission event shape can extend `ProbePing` for occasional choices without creating a dialogue engine.

## Redesign implemented

The root route now renders `ControlClient`, which owns one fleet snapshot and passes it to a compact fleet rail, central mission stage, and transmission panel. Probe characters use the layered SVG `ProbeVisual`; existing skin, scar, voyage, cargo, and ID data determine the visible result. Milestone pings can expose one small set of choices stored back on the original ping. Launching uses the existing quick-launch logic followed by a short presentation overlay. Debrief is a four-stage reveal. `/hangar` preserves the full existing management UI and `/archive` hosts Passport, Codex, and memorial records. Development builds include a clearly labelled cheat console; production renders nothing for it.

## First-player onboarding

`src/components/onboarding/CosmoForgeEntry.tsx` decides between onboarding and normal Control after authentication/cloud merging is ready. `src/lib/onboarding.ts` stores `cosmoforge-onboarding-v1`. No flag plus an empty fleet means a genuinely new player; an existing fleet skips onboarding. An `in_progress` record with a craft ID lets an interrupted first mission resume. The flag becomes `complete` only after the first debrief.

`FirstProbeOnboarding.tsx` owns only the focused first-session sequence. The preview probe becomes a real persisted `Craft` through the existing quick-launch/storage path. `onboardingMission` gives that craft a 75-second voyage without changing any normal duration. Its guaranteed encounter is `first_matching_signal` in `src/game/encounters/catalog.ts`. Return stays locked until its choice is resolved.

## Encounter system (current)

The 25 normal encounters live in `src/game/encounters/catalog.ts`; their readable format is in `types.ts`. `engine.ts` owns deterministic weighted selection, pacing, requirements, consequences, follow-ups and repeat protection. `src/game/transmissions.ts` is only the adapter between encounter choices and the existing transmission UI. React components do not contain encounter rules.

Rarity multipliers are intentionally steep: common `1`, uncommon `0.42`, rare `0.1`, strange `0.025`, cursed `0.003`, multiplied by optional encounter `weight`. Eligibility is checked first. Per-probe repeat history and story flags are stored on `Craft`; the small once-per-save ledger uses `cosmoforge_encounter_history_v1`. `once_per_probe`, `once_per_save`, `cooldownVoyages`, and `maxOccurrences` prevent repetition. Memory variants are checked in order and then fall back to personality-specific/default text.

Multi-part and delayed events are progress-based follow-up pings, not quests. The protected onboarding encounter is in the same catalogue but marked `onboardingOnly`; normal selection rejects it and onboarding crafts. Development Control can force an encounter by rarity or ID, clear histories, and inspect memory/story state. Automated engine coverage is in `tests/encounters.test.ts` and runs with `npm run test:encounters`.

Probe memories are plain values on `Craft.memory`, with helpers and later dialogue references in `src/game/probe-memory.ts`. Encounter resolution updates the original ping, existing relationship number, cargo/scars, and memory in one craft save. The debrief reads the same craft to reveal the decision. Development Control has a “Replay onboarding” action; its temporary probe is kept local and removed after replay, leaving the real fleet/cloud untouched.
## Optional 3D presentation layer

Runtime GLBs live in `public/models/`; editable Blender sources stay in
`tools/blender/`. Components in `src/components/three/` own rendering, lazy
loading, quality and errors. `src/lib/3d-assets.ts` owns the mission, scar and
loot mappings. The 3D code receives existing game data and does not save or
duplicate it.

Control uses `MissionScene3D` for the selected probe while fleet thumbnails stay
SVG. Onboarding and launch use `HangarScene3D`. Debrief uses the Hangar for
damage inspection and one `Find3D` cargo focus. Archive mounts `Find3D` only for
a selected discovered object. Hangar adds one inspection preview without
removing the existing builder.

Every integration point supplies the old `ProbeVisual` or CSS presentation as a
fallback. WebGL absence, forced 2D, or a caught render/model error leaves the
game usable. Low quality reduces pixel ratio, shadows, props and atmosphere.
Reduced-motion uses static demand rendering. See `3D_ASSETS.md` for paths,
sizes, Blender names and editing instructions.

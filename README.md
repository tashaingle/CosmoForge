# CosmoForge

**Design, launch, and command spacecraft** in a persistent, real-ish solar system.

Web-first playable alpha: modular ship design → mission launch → 3D solar system with time acceleration → offline progress → shareable mission links.

**Repo:** [github.com/tashaingle/CosmoForge](https://github.com/tashaingle/CosmoForge)

## Quick start (local)

```bash
npm install
cp .env.example .env.local   # optional until Supabase is wired
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Import **tashaingle/CosmoForge** in the [Vercel dashboard](https://vercel.com/new).
2. Framework preset: **Next.js** (auto-detected).
3. Add environment variables (same as `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional; server-only)
4. Deploy. Your app works **without** Supabase first (localStorage hangar + long share URLs). With Supabase, shares become short `/s/xxxxx` links.

## Supabase setup

1. Create a project in [Supabase](https://supabase.com).
2. **SQL Editor** → paste and run [`supabase/schema.sql`](./supabase/schema.sql).
3. **Project Settings → API** → copy Project URL + `anon` public key.
4. Put them in `.env.local` (local) and Vercel env (production).

### What the schema includes

| Table | Purpose |
|--------|---------|
| `crafts` | Cloud fleet (auth-ready; hangar still uses localStorage in Alpha) |
| `mission_shares` | Short public mission snapshots for `/s/[id]` |

## What’s in the Alpha

| Feature | Status |
|--------|--------|
| Hangar + fleet (local + cloud) | ✅ |
| Magic-link auth (Supabase) | ✅ |
| Modular ship builder (mass, power, Δv) | ✅ |
| Missions (LEO, lunar, Mars, belt) | ✅ |
| 3D solar system + craft | ✅ |
| Time acceleration + offline catch-up | ✅ |
| Share (URL snapshot or Supabase short link) | ✅ |
| Other players’ craft on the map | ✅ |
| Landing polish + mobile layout | ✅ |
| Sky events (catalog calendar) | ✅ |
| Live JPL CAD + NASA DONKI feed | ✅ |
| JPL Horizons planet/Moon ephemeris bake | ✅ |
| Credits economy + cosmetics shop | ✅ |
| Player marketplace (25% take-rate) | ✅ |
| AI co-pilot / AR | ⏳ |

## How to play

1. **New spacecraft** from the hangar  
2. **Design** — bus, power, engine, tanks, payload  
3. **Launch** — pick a mission your Δv supports  
4. **Command** — time-warp, camera focus, telemetry  
5. **Share** — copy a mission link  

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind  
- **React Three Fiber** + Drei  
- **Supabase** (optional for short share links; required path for multiplayer next)  
- **Vercel** for hosting  

## Project layout

```
src/
  app/                 # routes + API
  components/          # hangar, builder, space, mission
  lib/                 # orbital, ship, storage, supabase
supabase/
  schema.sql           # run once in Supabase SQL Editor
```

## Scripts

```bash
npm run dev
npm run build
npm run start
```

## Notes

- Orbits are simplified (play-first Δv gates, Kepler craft, circular planets).  
- Not affiliated with NASA/JPL.  
- Share RLS is open for Alpha inserts — tighten before a public multiplayer launch.

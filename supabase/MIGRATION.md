# Supabase setup for CosmoForge (auth + multiplayer)

## 1. Run SQL

In **Supabase → SQL Editor**, run the full contents of [`schema.sql`](./schema.sql).

This adds:

- `commander_name` + `skin_id` on crafts  
- `profiles` (display name + **credits / cosmetics wallet**) + signup trigger  
- RLS so **inflight crafts are publicly readable** (shared map)  
- Owners still fully manage their own crafts  

Re-run after updates for economy / cosmetics / **marketplace** tables and `market_purchase` RPC.

### Marketplace notes

- Take-rate: **25%** platform fee (`market_purchase` function)
- Tables: `market_listings`, `market_sales`, `market_platform_ledger`
- Sellers list skins / blueprints; buyers pay full price; seller receives 75%

### Live JPL / NASA feed

No Supabase setup required. The app hits:

- JPL CAD: `https://ssd-api.jpl.nasa.gov/cad.api` (NEO close approaches)
- NASA DONKI: flares + CMEs (optional `NASA_API_KEY` env; else `DEMO_KEY`)

## 2. Auth redirect URLs

**Authentication → URL Configuration**

| Field | Value |
|--------|--------|
| Site URL | `https://cosmo-forge.vercel.app` |
| Redirect URLs | `https://cosmo-forge.vercel.app/auth/callback` |
| | `http://localhost:3000/auth/callback` |

## 3. Enable Email magic link

**Authentication → Providers → Email**

- Enable Email  
- Enable **magic link** (OTP)  

## 4. Env vars (already set)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Redeploy Vercel after changing auth URLs if needed.

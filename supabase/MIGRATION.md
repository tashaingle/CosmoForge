# Supabase setup for CosmoForge (auth + multiplayer)

## 1. Run SQL

In **Supabase → SQL Editor**, run the full contents of [`schema.sql`](./schema.sql).

This adds:

- `commander_name` on crafts  
- `profiles` table + signup trigger  
- RLS so **inflight crafts are publicly readable** (shared map)  
- Owners still fully manage their own crafts  

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

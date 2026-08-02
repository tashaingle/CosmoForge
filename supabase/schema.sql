-- CosmoForge Alpha — run this in Supabase SQL Editor
-- Project: CosmoForge

-- Crafts owned by authenticated users (or anonymous device id later)
create table if not exists public.crafts (
  id text primary key,
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  part_ids text[] not null default '{}',
  status text not null default 'design'
    check (status in ('design', 'inflight', 'complete')),
  mission_id text,
  orbit jsonb,
  launched_at timestamptz,
  last_sim_ms bigint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crafts_user_id_idx on public.crafts (user_id);
create index if not exists crafts_status_idx on public.crafts (status);

-- Public share snapshots (short IDs instead of huge URL tokens)
create table if not exists public.mission_shares (
  id text primary key,
  craft_snapshot jsonb not null,
  craft_name text,
  mission_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists mission_shares_created_at_idx
  on public.mission_shares (created_at desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists crafts_set_updated_at on public.crafts;
create trigger crafts_set_updated_at
  before update on public.crafts
  for each row execute function public.set_updated_at();

-- RLS
alter table public.crafts enable row level security;
alter table public.mission_shares enable row level security;

-- Crafts: owners only (when logged in)
drop policy if exists "Users manage own crafts" on public.crafts;
create policy "Users manage own crafts"
  on public.crafts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Shares: anyone can read (public mission links)
drop policy if exists "Public can read shares" on public.mission_shares;
create policy "Public can read shares"
  on public.mission_shares
  for select
  using (true);

-- Shares: allow public insert for Alpha (no auth yet).
-- Tighten to authenticated-only before a public multiplayer launch.
drop policy if exists "Anyone can create shares" on public.mission_shares;
create policy "Anyone can create shares"
  on public.mission_shares
  for insert
  with check (true);

drop policy if exists "Auth users can create shares" on public.mission_shares;

comment on table public.crafts is 'Player spacecraft designs and flight state';
comment on table public.mission_shares is 'Public shareable mission snapshots';

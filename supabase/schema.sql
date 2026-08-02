-- CosmoForge — run in Supabase SQL Editor (safe to re-run)

-- ── Crafts ──────────────────────────────────────────────────────────
create table if not exists public.crafts (
  id text primary key,
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  commander_name text,
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

-- Migrate older installs
alter table public.crafts add column if not exists commander_name text;
alter table public.crafts add column if not exists skin_id text;

create index if not exists crafts_user_id_idx on public.crafts (user_id);
create index if not exists crafts_status_idx on public.crafts (status);
create index if not exists crafts_inflight_idx on public.crafts (status)
  where status = 'inflight';

-- ── Profiles ────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  credits integer default 500,
  unlocked_skin_ids text[] default array['default'],
  equipped_skin_id text default 'default',
  claimed_launch_rewards jsonb default '{}'::jsonb,
  claimed_milestones text[] default '{}',
  wallet_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists credits integer default 500;
alter table public.profiles add column if not exists unlocked_skin_ids text[] default array['default'];
alter table public.profiles add column if not exists equipped_skin_id text default 'default';
alter table public.profiles add column if not exists claimed_launch_rewards jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists claimed_milestones text[] default '{}';
alter table public.profiles add column if not exists wallet_updated_at timestamptz;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Mission shares ──────────────────────────────────────────────────
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

-- ── updated_at ──────────────────────────────────────────────────────
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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.crafts enable row level security;
alter table public.mission_shares enable row level security;
alter table public.profiles enable row level security;

-- Crafts: drop legacy all-in-one policy
drop policy if exists "Users manage own crafts" on public.crafts;

drop policy if exists "Users select own crafts" on public.crafts;
create policy "Users select own crafts"
  on public.crafts for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own crafts" on public.crafts;
create policy "Users insert own crafts"
  on public.crafts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own crafts" on public.crafts;
create policy "Users update own crafts"
  on public.crafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own crafts" on public.crafts;
create policy "Users delete own crafts"
  on public.crafts for delete
  using (auth.uid() = user_id);

-- Multiplayer map: anyone can see craft that are in flight
drop policy if exists "Public view inflight crafts" on public.crafts;
create policy "Public view inflight crafts"
  on public.crafts for select
  using (status = 'inflight');

-- Shares
drop policy if exists "Public can read shares" on public.mission_shares;
create policy "Public can read shares"
  on public.mission_shares for select
  using (true);

drop policy if exists "Anyone can create shares" on public.mission_shares;
create policy "Anyone can create shares"
  on public.mission_shares for insert
  with check (true);

drop policy if exists "Auth users can create shares" on public.mission_shares;

-- Profiles
drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles"
  on public.profiles for select
  using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

comment on table public.crafts is 'Player spacecraft designs and flight state';
comment on table public.mission_shares is 'Public shareable mission snapshots';
comment on table public.profiles is 'Commander display names';

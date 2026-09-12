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

alter table public.crafts drop constraint if exists crafts_status_check;
alter table public.crafts add constraint crafts_status_check
  check (status in ('design', 'inflight', 'complete', 'lost', 'retired'));

-- Probe personality, pings, scars, cargo, debrief, memory. Owner-only; not on
-- public.crafts so the inflight map cannot read a probe's private story.
create table if not exists public.craft_stories (
  craft_id text primary key references public.crafts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null default 1,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists craft_stories_user_id_idx on public.craft_stories (user_id);

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

drop trigger if exists craft_stories_set_updated_at on public.craft_stories;
create trigger craft_stories_set_updated_at
  before update on public.craft_stories
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.crafts enable row level security;
alter table public.craft_stories enable row level security;
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

drop policy if exists "Users select own craft stories" on public.craft_stories;
create policy "Users select own craft stories"
  on public.craft_stories for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own craft stories" on public.craft_stories;
create policy "Users insert own craft stories"
  on public.craft_stories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own craft stories" on public.craft_stories;
create policy "Users update own craft stories"
  on public.craft_stories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own craft stories" on public.craft_stories;
create policy "Users delete own craft stories"
  on public.craft_stories for delete
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
comment on table public.craft_stories is 'Owner-only probe personality, pings, scars, cargo and debrief';
comment on table public.mission_shares is 'Public shareable mission snapshots';
comment on table public.profiles is 'Commander display names + wallet';

-- ── Marketplace (25% platform take-rate) ────────────────────────────
create table if not exists public.market_listings (
  id text primary key,
  seller_id uuid not null references auth.users (id) on delete cascade,
  seller_name text,
  item_type text not null check (item_type in ('skin', 'blueprint')),
  item_id text not null,
  title text not null,
  description text default '',
  price_credits integer not null check (price_credits >= 10),
  payload jsonb,
  status text not null default 'active'
    check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists market_listings_status_idx
  on public.market_listings (status, created_at desc);
create index if not exists market_listings_seller_idx
  on public.market_listings (seller_id);

create table if not exists public.market_sales (
  id text primary key,
  listing_id text not null references public.market_listings (id),
  seller_id uuid not null,
  buyer_id uuid not null,
  price_credits integer not null,
  take_rate numeric not null,
  platform_fee integer not null,
  seller_net integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.market_platform_ledger (
  id bigserial primary key,
  listing_id text,
  fee_credits integer not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.market_listings enable row level security;
alter table public.market_sales enable row level security;
alter table public.market_platform_ledger enable row level security;

drop policy if exists "Anyone read active listings" on public.market_listings;
create policy "Anyone read active listings"
  on public.market_listings for select
  using (true);

drop policy if exists "Sellers insert listings" on public.market_listings;
create policy "Sellers insert listings"
  on public.market_listings for insert
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers update own listings" on public.market_listings;
create policy "Sellers update own listings"
  on public.market_listings for update
  using (auth.uid() = seller_id);

drop policy if exists "Buyers read own sales" on public.market_sales;
create policy "Buyers read own sales"
  on public.market_sales for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- No direct client writes to sales / ledger (RPC only)
drop policy if exists "No client insert sales" on public.market_sales;

-- Atomic purchase with 25% platform take-rate
create or replace function public.market_purchase(p_listing_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_listing public.market_listings%rowtype;
  v_buyer_credits integer;
  v_seller_credits integer;
  v_take numeric := 0.25;
  v_fee integer;
  v_net integer;
  v_sale_id text;
  v_skins text[];
  v_new_craft_id text;
begin
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error_message', 'Not signed in');
  end if;

  select * into v_listing
  from public.market_listings
  where id = p_listing_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error_message', 'Listing not found');
  end if;

  if v_listing.status <> 'active' then
    return jsonb_build_object('ok', false, 'error_message', 'Listing not active');
  end if;

  if v_listing.seller_id = v_buyer then
    return jsonb_build_object('ok', false, 'error_message', 'Cannot buy your own listing');
  end if;

  select coalesce(credits, 0) into v_buyer_credits
  from public.profiles where id = v_buyer for update;

  if v_buyer_credits is null then
    return jsonb_build_object('ok', false, 'error_message', 'Buyer profile missing');
  end if;

  if v_buyer_credits < v_listing.price_credits then
    return jsonb_build_object('ok', false, 'error_message', 'Not enough credits');
  end if;

  v_fee := greatest(1, round(v_listing.price_credits * v_take)::integer);
  v_net := v_listing.price_credits - v_fee;

  update public.profiles
  set credits = credits - v_listing.price_credits,
      wallet_updated_at = now()
  where id = v_buyer;

  update public.profiles
  set credits = coalesce(credits, 0) + v_net,
      wallet_updated_at = now()
  where id = v_listing.seller_id;

  -- Grant item
  if v_listing.item_type = 'skin' then
    select unlocked_skin_ids into v_skins from public.profiles where id = v_buyer;
    if v_skins is null then
      v_skins := array[v_listing.item_id];
    elsif not (v_listing.item_id = any (v_skins)) then
      v_skins := array_append(v_skins, v_listing.item_id);
    end if;
    update public.profiles
    set unlocked_skin_ids = v_skins
    where id = v_buyer;
  elsif v_listing.item_type = 'blueprint' then
    v_new_craft_id := replace(gen_random_uuid()::text, '-', '');
    insert into public.crafts (
      id, user_id, name, part_ids, status, notes, skin_id, commander_name
    ) values (
      v_new_craft_id,
      v_buyer,
      coalesce(v_listing.payload->>'name', v_listing.title),
      coalesce(
        (select array_agg(x)::text[] from jsonb_array_elements_text(v_listing.payload->'partIds') as t(x)),
        '{}'::text[]
      ),
      'design',
      'Purchased blueprint from marketplace',
      coalesce(v_listing.payload->>'skinId', 'default'),
      (select display_name from public.profiles where id = v_buyer)
    );
  end if;

  update public.market_listings
  set status = 'sold',
      buyer_id = v_buyer,
      sold_at = now()
  where id = p_listing_id;

  v_sale_id := replace(gen_random_uuid()::text, '-', '');
  insert into public.market_sales (
    id, listing_id, seller_id, buyer_id, price_credits, take_rate, platform_fee, seller_net
  ) values (
    v_sale_id, p_listing_id, v_listing.seller_id, v_buyer,
    v_listing.price_credits, v_take, v_fee, v_net
  );

  insert into public.market_platform_ledger (listing_id, fee_credits, note)
  values (p_listing_id, v_fee, 'marketplace take-rate');

  return jsonb_build_object(
    'ok', true,
    'price_credits', v_listing.price_credits,
    'platform_fee', v_fee,
    'seller_net', v_net,
    'take_rate', v_take
  );
end;
$$;

grant execute on function public.market_purchase(text) to authenticated;
grant execute on function public.market_purchase(text) to anon;

comment on function public.market_purchase is 'Buy listing; 25% platform fee, 75% seller';

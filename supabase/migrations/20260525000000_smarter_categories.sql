-- Pantry Run — M15 Smarter Categories
--
-- Two-tier auto-categorisation: keyword pass on the client (sync, offline),
-- LLM fallback in an Edge Function (online, globally cached). This migration
-- creates the persistence layer:
--
--   1. category_overrides — global cache, shared across all households so the
--      LLM cost (and free-tier rate-limit) is amortised. Writes go through
--      the categorize_item Edge Function (service-role); the client only reads.
--   2. household_category_overrides — per-household manual corrections. User
--      picks beat LLM picks. Per the M15 PII decision (locked 2026-05-25),
--      household corrections also write through to the global cache via the
--      Edge Function. This table is the household-scoped layer the cache
--      stores against.
--   3. category_request_counters — per-household per-day LLM call counter
--      backing the 150-calls/day rate limit. Also tracks cache hit/miss for
--      manual observability (no Sentry breadcrumbs per the M15 plan).
--   4. list_items.category_pending — true when an item was added offline and
--      its category needs repair on reconnect (active sweep in useList drain).
--
-- CATEGORY_ORDER grows from 10 → 14: Produce, Dairy, Meat, Bakery, Pantry,
-- Frozen, Beverages, Household, Personal Care, Snacks, Condiments & Sauces,
-- Baby, Pet, Other. The CHECK constraints on category columns enforce this
-- new vocabulary for any rows the M15 path writes. list_items.category is
-- left without a CHECK to avoid breaking pre-M15 rows that may carry stray
-- values; the client coerces unknown values to 'Other' on read.

-- ────────────────────────────────────────────────────────────────────────────
-- Column: list_items.category_pending
-- ────────────────────────────────────────────────────────────────────────────

alter table public.list_items
  add column category_pending boolean not null default false;

create index list_items_category_pending_idx
  on public.list_items (list_id)
  where category_pending = true;

-- ────────────────────────────────────────────────────────────────────────────
-- Table: category_overrides (global cache)
--
-- normalised_name is the lowercase + whitespace-collapsed item name. The
-- client and Edge Function are the only writers; both normalise before
-- insert, so we don't enforce normalisation in a trigger.
-- ────────────────────────────────────────────────────────────────────────────

create table public.category_overrides (
  normalised_name text primary key check (char_length(normalised_name) between 1 and 200),
  category        text not null check (category in (
    'Produce', 'Dairy', 'Meat', 'Bakery', 'Pantry', 'Frozen', 'Beverages',
    'Household', 'Personal Care', 'Snacks', 'Condiments & Sauces', 'Baby',
    'Pet', 'Other'
  )),
  source          text not null check (source in ('llm', 'keyword', 'manual')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger category_overrides_set_updated_at
  before update on public.category_overrides
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Table: household_category_overrides (per-household manual corrections)
--
-- Composite primary key (household_id, normalised_name): one correction per
-- name per household. Re-correcting overwrites the existing row.
-- ────────────────────────────────────────────────────────────────────────────

create table public.household_category_overrides (
  household_id    uuid not null references public.households (id) on delete cascade,
  normalised_name text not null check (char_length(normalised_name) between 1 and 200),
  category        text not null check (category in (
    'Produce', 'Dairy', 'Meat', 'Bakery', 'Pantry', 'Frozen', 'Beverages',
    'Household', 'Personal Care', 'Snacks', 'Condiments & Sauces', 'Baby',
    'Pet', 'Other'
  )),
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (household_id, normalised_name)
);

create trigger household_category_overrides_set_updated_at
  before update on public.household_category_overrides
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Table: category_request_counters (rate limit + manual observability)
--
-- One row per household per UTC day. Inserted by the Edge Function on first
-- call of the day, then upserted on each subsequent call. SELECT-only for
-- household members (future "smarter categories used today" UI); writes
-- happen via service-role from the Edge Function.
-- ────────────────────────────────────────────────────────────────────────────

create table public.category_request_counters (
  household_id  uuid not null references public.households (id) on delete cascade,
  day           date not null,
  count         integer not null default 0 check (count >= 0),
  cache_hits    integer not null default 0 check (cache_hits >= 0),
  cache_misses  integer not null default 0 check (cache_misses >= 0),
  updated_at    timestamptz not null default now(),
  primary key (household_id, day)
);

create trigger category_request_counters_set_updated_at
  before update on public.category_request_counters
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
--
-- category_overrides:           public read for authenticated users; writes
--                               via service-role only (no policy).
-- household_category_overrides: full CRUD for household members.
-- category_request_counters:    members SELECT their own household; writes
--                               via service-role only.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.category_overrides            enable row level security;
alter table public.household_category_overrides  enable row level security;
alter table public.category_request_counters     enable row level security;

create policy category_overrides_select_all
  on public.category_overrides for select
  to authenticated
  using (true);

create policy household_category_overrides_select_members
  on public.household_category_overrides for select
  to authenticated
  using (public.is_household_member(household_id));

create policy household_category_overrides_insert_members
  on public.household_category_overrides for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy household_category_overrides_update_members
  on public.household_category_overrides for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy household_category_overrides_delete_members
  on public.household_category_overrides for delete
  to authenticated
  using (public.is_household_member(household_id));

create policy category_request_counters_select_members
  on public.category_request_counters for select
  to authenticated
  using (public.is_household_member(household_id));

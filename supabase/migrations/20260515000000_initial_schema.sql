-- Pantry Run — initial schema (M0)
-- Tables, indexes, RLS, updated_at trigger, Realtime publication.
-- Schema mirrors CLAUDE.md §7. Tightened join logic lands in M2 via a
-- SECURITY DEFINER RPC; the membership insert policy here is permissive
-- because anonymous users still need to be able to add themselves on create.

create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────────────────────
-- Tables
-- ────────────────────────────────────────────────────────────────────────────

create table public.households (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 80),
  invite_code     text not null unique
                    check (char_length(invite_code) = 6 and invite_code ~ '^[A-Z0-9]+$'),
  code_expires_at timestamptz not null,
  created_at      timestamptz not null default now()
);

create index households_invite_code_idx on public.households (invite_code);

create table public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  joined_at    timestamptz not null default now(),
  unique (household_id, user_id)
);

create index household_members_user_id_idx      on public.household_members (user_id);
create index household_members_household_id_idx on public.household_members (household_id);

create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null default 'Shopping List'
                 check (char_length(name) between 1 and 80),
  created_at   timestamptz not null default now()
);

create index lists_household_id_idx on public.lists (household_id);

create table public.list_items (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.lists (id) on delete cascade,
  added_by    uuid references auth.users (id) on delete set null,
  name        text not null check (char_length(name) between 1 and 200),
  quantity    text check (quantity is null or char_length(quantity) <= 40),
  category    text not null default 'Other',
  is_checked  boolean not null default false,
  checked_by  uuid references auth.users (id) on delete set null,
  checked_at  timestamptz,
  note        text check (note is null or char_length(note) <= 500),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index list_items_list_id_idx              on public.list_items (list_id);
create index list_items_list_id_is_checked_idx   on public.list_items (list_id, is_checked);

-- ────────────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger list_items_set_updated_at
  before update on public.list_items
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Membership helpers
-- SECURITY DEFINER so RLS policies on household_members don't recurse when
-- the policies on other tables call back into this function.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = p_household_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

create or replace function public.is_household_owner(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = p_household_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

revoke all on function public.is_household_owner(uuid) from public;
grant execute on function public.is_household_owner(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.lists             enable row level security;
alter table public.list_items        enable row level security;

-- households -----------------------------------------------------------------

create policy households_select_members
  on public.households for select
  to authenticated
  using (public.is_household_member(id));

create policy households_insert_authenticated
  on public.households for insert
  to authenticated
  with check (true);

create policy households_update_owner
  on public.households for update
  to authenticated
  using (public.is_household_owner(id))
  with check (public.is_household_owner(id));

create policy households_delete_owner
  on public.households for delete
  to authenticated
  using (public.is_household_owner(id));

-- household_members ----------------------------------------------------------

create policy household_members_select_same_household
  on public.household_members for select
  to authenticated
  using (public.is_household_member(household_id));

-- Permissive insert; the M2 RPC (`join_household_by_code`) validates the
-- invite code under SECURITY DEFINER before delegating to this table.
create policy household_members_insert_self
  on public.household_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy household_members_update_self_or_owner
  on public.household_members for update
  to authenticated
  using (user_id = auth.uid() or public.is_household_owner(household_id))
  with check (user_id = auth.uid() or public.is_household_owner(household_id));

create policy household_members_delete_self_or_owner
  on public.household_members for delete
  to authenticated
  using (user_id = auth.uid() or public.is_household_owner(household_id));

-- lists ----------------------------------------------------------------------

create policy lists_select_members
  on public.lists for select
  to authenticated
  using (public.is_household_member(household_id));

create policy lists_insert_members
  on public.lists for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy lists_update_members
  on public.lists for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy lists_delete_owner
  on public.lists for delete
  to authenticated
  using (public.is_household_owner(household_id));

-- list_items -----------------------------------------------------------------

create policy list_items_select_members
  on public.list_items for select
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and public.is_household_member(l.household_id)
    )
  );

create policy list_items_insert_members
  on public.list_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_id
        and public.is_household_member(l.household_id)
    )
  );

create policy list_items_update_members
  on public.list_items for update
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and public.is_household_member(l.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_id
        and public.is_household_member(l.household_id)
    )
  );

create policy list_items_delete_members
  on public.list_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and public.is_household_member(l.household_id)
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Realtime — REPLICA IDENTITY FULL so UPDATE payloads include old.* values,
-- which the optimistic-update reconciliation in `useList` relies on.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.list_items        replica identity full;
alter table public.household_members replica identity full;
alter table public.lists             replica identity full;
alter table public.households        replica identity full;

alter publication supabase_realtime add table
  public.list_items,
  public.household_members,
  public.lists,
  public.households;

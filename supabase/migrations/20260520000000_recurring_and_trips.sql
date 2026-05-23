-- Pantry Run — M11 Recurring / Staple Items + Shopping Trip Model
--
-- Two new concepts:
--   1. list_items.is_recurring — flag that survives "Finish shopping" (a
--      staple item is unchecked, not deleted, when a trip ends).
--   2. shopping_trips + shopping_trip_items — append-only history of completed
--      trips. Items are snapshotted (full copy, no FK to list_items) so trips
--      survive list deletion cleanly. M12 (Shopping History) reads from these.
--
-- One transactional RPC `finish_shopping(p_list_id)` performs the whole flow
-- atomically: snapshot checked items, delete non-recurring, uncheck recurring,
-- insert one trip row. Concurrent calls on the same list serialise via a
-- `for update` lock on the list row.

-- ────────────────────────────────────────────────────────────────────────────
-- Column: is_recurring
-- ────────────────────────────────────────────────────────────────────────────

alter table public.list_items
  add column is_recurring boolean not null default false;

-- ────────────────────────────────────────────────────────────────────────────
-- Tables: shopping_trips, shopping_trip_items
--
-- household_id is the auth key (M12 history is household-wide). list_id is
-- informational — kept as `on delete set null` so trips outlive their list.
-- ────────────────────────────────────────────────────────────────────────────

create table public.shopping_trips (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  list_id      uuid references public.lists (id) on delete set null,
  finished_by  uuid references auth.users (id) on delete set null,
  finished_at  timestamptz not null default now(),
  item_count   integer not null default 0 check (item_count >= 0)
);

create index shopping_trips_household_finished_idx
  on public.shopping_trips (household_id, finished_at desc);

create index shopping_trips_list_id_idx
  on public.shopping_trips (list_id);

-- Snapshot table — column shape mirrors list_items so M12 restore can map
-- back cleanly. quantity (legacy text) carried for pre-M8 rows; canonical
-- columns are quantity_value + quantity_unit per the M8 schema.
create table public.shopping_trip_items (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.shopping_trips (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 200),
  quantity        text check (quantity is null or char_length(quantity) <= 40),
  quantity_value  numeric(6, 2) check (quantity_value is null or quantity_value > 0),
  quantity_unit   text check (
    quantity_unit is null
    or quantity_unit in ('g', 'kg', 'mL', 'L', 'piece', 'can', 'dozen')
  ),
  category        text not null default 'Other',
  note            text check (note is null or char_length(note) <= 500),
  was_recurring   boolean not null default false,
  added_by_name   text check (added_by_name is null or char_length(added_by_name) <= 40),
  created_at      timestamptz not null default now()
);

create index shopping_trip_items_trip_id_idx
  on public.shopping_trip_items (trip_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
--
-- Reads scoped to household members. Writes happen only via finish_shopping
-- (SECURITY DEFINER bypasses RLS) — no insert/update/delete policies needed.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.shopping_trips      enable row level security;
alter table public.shopping_trip_items enable row level security;

create policy shopping_trips_select_members
  on public.shopping_trips for select
  to authenticated
  using (public.is_household_member(household_id));

create policy shopping_trip_items_select_members
  on public.shopping_trip_items for select
  to authenticated
  using (
    exists (
      select 1 from public.shopping_trips t
      where t.id = shopping_trip_items.trip_id
        and public.is_household_member(t.household_id)
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: finish_shopping
--
-- One transaction:
--   1. Lock the list row (serialises concurrent finishes per list).
--   2. Insert one shopping_trips row with item_count = number of checked.
--   3. Snapshot every checked list_item into shopping_trip_items.
--   4. Delete non-recurring checked items.
--   5. Uncheck recurring items (they stay on the list for the next trip).
--
-- Returns json:
--   { status: 'finished', trip_id, removed, kept } on success
--   { status: 'nothing_to_finish' }                 when no items checked
--   { status: 'list_not_found' }                    when list missing
--   { status: 'forbidden' }                         when caller isn't a member
--   { status: 'unauthenticated' }                   when no auth.uid()
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.finish_shopping(p_list_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_household_id uuid;
  v_checked_cnt  int;
  v_removed_cnt  int;
  v_kept_cnt     int;
  v_trip_id      uuid;
begin
  if v_user_id is null then
    return json_build_object('status', 'unauthenticated');
  end if;

  -- Lock the list row; concurrent finishes on the same list serialise here.
  select household_id into v_household_id
  from public.lists
  where id = p_list_id
  for update;

  if v_household_id is null then
    return json_build_object('status', 'list_not_found');
  end if;

  if not public.is_household_member(v_household_id) then
    return json_build_object('status', 'forbidden');
  end if;

  select count(*)::int into v_checked_cnt
  from public.list_items
  where list_id = p_list_id and is_checked = true;

  if v_checked_cnt = 0 then
    return json_build_object('status', 'nothing_to_finish');
  end if;

  insert into public.shopping_trips (household_id, list_id, finished_by, item_count)
  values (v_household_id, p_list_id, v_user_id, v_checked_cnt)
  returning id into v_trip_id;

  -- Snapshot every checked item. added_by_name uses the live display_name
  -- when the adder is still a member, otherwise falls back to the M3.5
  -- snapshot column on list_items.
  insert into public.shopping_trip_items (
    trip_id, name, quantity, quantity_value, quantity_unit,
    category, note, was_recurring, added_by_name
  )
  select
    v_trip_id,
    li.name,
    li.quantity,
    li.quantity_value,
    li.quantity_unit,
    li.category,
    li.note,
    li.is_recurring,
    coalesce(
      (select hm.display_name
         from public.household_members hm
        where hm.user_id = li.added_by
          and hm.household_id = v_household_id),
      li.added_by_name
    )
  from public.list_items li
  where li.list_id = p_list_id and li.is_checked = true;

  delete from public.list_items
  where list_id = p_list_id
    and is_checked = true
    and is_recurring = false;

  get diagnostics v_removed_cnt = row_count;

  update public.list_items
  set is_checked = false,
      checked_by = null,
      checked_at = null
  where list_id = p_list_id
    and is_checked = true
    and is_recurring = true;

  get diagnostics v_kept_cnt = row_count;

  return json_build_object(
    'status',  'finished',
    'trip_id', v_trip_id,
    'removed', v_removed_cnt,
    'kept',    v_kept_cnt
  );
end;
$$;

revoke all on function public.finish_shopping(uuid) from public;
grant execute on function public.finish_shopping(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Realtime — REPLICA IDENTITY FULL so M12's history UI can subscribe and
-- receive full row payloads on insert.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.shopping_trips      replica identity full;
alter table public.shopping_trip_items replica identity full;

alter publication supabase_realtime add table
  public.shopping_trips,
  public.shopping_trip_items;

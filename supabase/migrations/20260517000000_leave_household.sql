-- Pantry Run — M3.5 (Testing & Feedback)
-- Leave / remove member support.
--   • `list_items.added_by_name` snapshot column so attribution survives
--     a member leaving or being removed (UI renders "Added by X (former member)").
--   • BEFORE DELETE trigger on household_members snapshots display_name onto
--     every list_item that member added — covers self-leave, owner-remove, and
--     household cascade-delete in one place.
--   • `leave_household(p_new_owner_user_id uuid default null)` RPC:
--       non-owner       → 'left'
--       owner alone     → 'left' (household cascade-deletes)
--       owner + others  → 'needs_transfer' OR 'transferred_and_left' OR
--                         'invalid_successor'
--   • Removing another member stays a client-side DELETE; the existing
--     household_members_delete_self_or_owner policy covers it.

-- ────────────────────────────────────────────────────────────────────────────
-- Schema: snapshot column
-- ────────────────────────────────────────────────────────────────────────────

alter table public.list_items
  add column if not exists added_by_name text
    check (added_by_name is null or char_length(added_by_name) <= 40);

-- ────────────────────────────────────────────────────────────────────────────
-- Trigger: snapshot display_name onto list_items before a member row is deleted
-- SECURITY DEFINER so the UPDATE bypasses RLS — necessary for the household
-- cascade-delete path, where the household row is being torn down and
-- is_household_member(...) returns false during the cascade.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.snapshot_member_display_name_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.display_name is not null then
    update public.list_items li
    set added_by_name = old.display_name
    from public.lists l
    where li.list_id = l.id
      and l.household_id = old.household_id
      and li.added_by = old.user_id
      and li.added_by_name is null;
  end if;
  return old;
end;
$$;

drop trigger if exists household_members_snapshot_name_before_delete
  on public.household_members;

create trigger household_members_snapshot_name_before_delete
  before delete on public.household_members
  for each row execute function public.snapshot_member_display_name_on_delete();

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: leave_household
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.leave_household(p_new_owner_user_id uuid default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_household_id uuid;
  v_role         text;
  v_other_count  int;
  v_valid_succ   boolean;
begin
  if v_user_id is null then
    return json_build_object('status', 'unauthenticated');
  end if;

  select household_id, role
  into v_household_id, v_role
  from public.household_members
  where user_id = v_user_id
  limit 1;

  if v_household_id is null then
    return json_build_object('status', 'not_a_member');
  end if;

  select count(*)::int into v_other_count
  from public.household_members
  where household_id = v_household_id
    and user_id <> v_user_id;

  -- Non-owner: just delete self.
  if v_role <> 'owner' then
    delete from public.household_members
    where user_id = v_user_id and household_id = v_household_id;
    return json_build_object('status', 'left');
  end if;

  -- Owner alone: household has no value once owner leaves — cascade-delete it.
  if v_other_count = 0 then
    delete from public.households where id = v_household_id;
    return json_build_object('status', 'left');
  end if;

  -- Owner with other members: need a successor.
  if p_new_owner_user_id is null then
    return json_build_object('status', 'needs_transfer');
  end if;

  if p_new_owner_user_id = v_user_id then
    return json_build_object('status', 'invalid_successor');
  end if;

  select exists (
    select 1 from public.household_members
    where household_id = v_household_id
      and user_id = p_new_owner_user_id
  ) into v_valid_succ;

  if not v_valid_succ then
    return json_build_object('status', 'invalid_successor');
  end if;

  update public.household_members
  set role = 'owner'
  where household_id = v_household_id
    and user_id = p_new_owner_user_id;

  delete from public.household_members
  where user_id = v_user_id and household_id = v_household_id;

  return json_build_object('status', 'transferred_and_left');
end;
$$;

revoke all on function public.leave_household(uuid) from public;
grant execute on function public.leave_household(uuid) to authenticated;

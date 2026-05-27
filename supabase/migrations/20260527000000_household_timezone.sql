-- Pantry Run — M17 Household timezone
--
-- Adds the timezone column households need to anchor reminder recurrence math
-- (see CLAUDE.md §17). Display is always rendered in the viewer's device
-- timezone — this column is the anchor for the *scheduling* side so a rule
-- like "every Thursday at 7pm" stays at 7pm local across DST transitions.
--
-- No CHECK constraint here because Postgres CHECK can't subquery
-- pg_timezone_names. Validation lives in the RPCs below (and in
-- create_household via the regenerated overload).

alter table public.households
  add column timezone text not null default 'Australia/Sydney';

-- ────────────────────────────────────────────────────────────────────────────
-- create_household — regenerated with an optional p_timezone parameter.
-- Client passes `Intl.DateTimeFormat().resolvedOptions().timeZone` at create
-- time so a household defaults to the creator's device zone, falling back to
-- Australia/Sydney if the value is unrecognised.
-- ────────────────────────────────────────────────────────────────────────────

drop function if exists public.create_household(text, text);

create or replace function public.create_household(
  p_name         text,
  p_display_name text default null,
  p_timezone     text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_household_id uuid;
  v_invite_code  text;
  v_code_expires timestamptz := now() + interval '24 hours';
  v_attempt      int := 0;
  v_clean_name   text;
  v_clean_dname  text;
  v_clean_tz     text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_clean_name := nullif(btrim(p_name), '');
  if v_clean_name is null or char_length(v_clean_name) > 80 then
    raise exception 'invalid_household_name' using errcode = '22023';
  end if;

  v_clean_dname := nullif(btrim(p_display_name), '');
  if v_clean_dname is not null and char_length(v_clean_dname) > 40 then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;

  -- Timezone: accept any IANA name Postgres knows; silently fall back to the
  -- default if the client sent garbage (e.g. a stale device zone). We don't
  -- raise — the household is far too valuable to fail to create over a tz.
  v_clean_tz := nullif(btrim(p_timezone), '');
  if v_clean_tz is null
     or not exists (select 1 from pg_timezone_names where name = v_clean_tz)
  then
    v_clean_tz := 'Australia/Sydney';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_invite_code := public.gen_invite_code();
    begin
      insert into public.households (name, invite_code, code_expires_at, timezone)
      values (v_clean_name, v_invite_code, v_code_expires, v_clean_tz)
      returning id into v_household_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 8 then
        raise exception 'invite_code_exhausted' using errcode = '40001';
      end if;
    end;
  end loop;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (v_household_id, v_user_id, 'owner', v_clean_dname);

  insert into public.lists (household_id, name)
  values (v_household_id, 'Shopping List');

  return json_build_object(
    'id',              v_household_id,
    'name',            v_clean_name,
    'invite_code',     v_invite_code,
    'code_expires_at', v_code_expires,
    'timezone',        v_clean_tz
  );
end;
$$;

revoke all on function public.create_household(text, text, text) from public;
grant execute on function public.create_household(text, text, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- set_household_timezone — any member can edit (the existing households
-- UPDATE policy is owner-only; this SECURITY DEFINER RPC opens the timezone
-- specifically to all members per the M17 D4 decision).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.set_household_timezone(
  p_household_id uuid,
  p_timezone     text
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_clean_tz text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_clean_tz := nullif(btrim(p_timezone), '');
  if v_clean_tz is null
     or not exists (select 1 from pg_timezone_names where name = v_clean_tz)
  then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;

  update public.households
     set timezone = v_clean_tz
   where id = p_household_id;

  return json_build_object('id', p_household_id, 'timezone', v_clean_tz);
end;
$$;

revoke all on function public.set_household_timezone(uuid, text) from public;
grant execute on function public.set_household_timezone(uuid, text) to authenticated;

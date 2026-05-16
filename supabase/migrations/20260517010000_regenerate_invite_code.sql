-- Pantry Run — M3.5 (F4): invite code regeneration + 7-day default
--
-- Why: 24h was chosen in M2 to mitigate invite-code abuse, but with no regen
-- path it has the opposite effect — any household more than a day old can't
-- accept new members at all. We fix this two ways:
--   • Bump the default expiry on create_household from 24 hours to 7 days
--     (typical households need more than a single day to onboard everyone).
--   • Add regenerate_invite_code(p_household_id) RPC. Owner-only, atomic,
--     same alphabet + collision retry as gen_invite_code. Lets owners revive
--     a household whose code has aged out, and rotate codes if they suspect
--     a leak.
--
-- Schema: unchanged. invite_code + code_expires_at columns are reused.

-- ────────────────────────────────────────────────────────────────────────────
-- create_household — bump default expiry from 24h to 7 days
-- (Full function redefined because CREATE OR REPLACE replaces the body
-- wholesale; only the v_code_expires initializer changed.)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.create_household(
  p_name         text,
  p_display_name text default null
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
  v_code_expires timestamptz := now() + interval '7 days';
  v_attempt      int := 0;
  v_clean_name   text;
  v_clean_dname  text;
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

  loop
    v_attempt := v_attempt + 1;
    v_invite_code := public.gen_invite_code();
    begin
      insert into public.households (name, invite_code, code_expires_at)
      values (v_clean_name, v_invite_code, v_code_expires)
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
    'code_expires_at', v_code_expires
  );
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- regenerate_invite_code(p_household_id uuid)
-- Owner-only. Same alphabet/retry pattern as gen_invite_code. Atomic UPDATE
-- so the household always has exactly one valid (code, expires_at) pair.
-- Returns { invite_code, code_expires_at }. Raises for auth/owner failures.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.regenerate_invite_code(p_household_id uuid)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_new_code    text;
  v_new_expires timestamptz := now() + interval '7 days';
  v_attempt     int := 0;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_household_id is null then
    raise exception 'invalid_household_id' using errcode = '22023';
  end if;
  if not public.is_household_owner(p_household_id) then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_new_code := public.gen_invite_code();
    begin
      update public.households
      set invite_code     = v_new_code,
          code_expires_at = v_new_expires
      where id = p_household_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 8 then
        raise exception 'invite_code_exhausted' using errcode = '40001';
      end if;
    end;
  end loop;

  return json_build_object(
    'invite_code',     v_new_code,
    'code_expires_at', v_new_expires
  );
end;
$$;

revoke all on function public.regenerate_invite_code(uuid) from public;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;

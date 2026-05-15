-- Pantry Run — M2 household RPCs
--
-- Adds the two SECURITY DEFINER paths the M0 migration deferred:
--   • create_household(name, display_name) — atomic households + owner member
--     + default Shopping List row, with server-generated invite code.
--   • join_household_by_code(invite_code, display_name) — validates the code,
--     inserts a member row, and returns one of four user-facing statuses.
-- Also tightens the household_members + households INSERT policies so the two
-- RPCs above are the only paths into those tables from client code.

-- ────────────────────────────────────────────────────────────────────────────
-- Invite code generator — 6 chars, [A-Z0-9] minus I/O/0/1 to avoid the
-- "is that an I or a 1" failure mode when users read codes aloud.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.gen_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet  constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  alpha_len constant int  := char_length(alphabet);
  code      text := '';
  i         int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * alpha_len)::int, 1);
  end loop;
  return code;
end;
$$;

revoke all on function public.gen_invite_code() from public;

-- ────────────────────────────────────────────────────────────────────────────
-- create_household
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
  v_code_expires timestamptz := now() + interval '24 hours';
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

revoke all on function public.create_household(text, text) from public;
grant execute on function public.create_household(text, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- join_household_by_code
--
-- Returns one of:
--   { status: 'ok',             household_id, household_name }
--   { status: 'already_member', household_id, household_name }
--   { status: 'expired' }
--   { status: 'not_found' }
-- Never raises for the four user-facing branches — the client maps each to
-- a UX state. Raises only for auth/validation failures.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.join_household_by_code(
  p_invite_code  text,
  p_display_name text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_clean_code  text;
  v_clean_dname text;
  v_household   record;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_clean_code := upper(regexp_replace(coalesce(p_invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if char_length(v_clean_code) <> 6 then
    return json_build_object('status', 'not_found');
  end if;

  v_clean_dname := nullif(btrim(p_display_name), '');
  if v_clean_dname is not null and char_length(v_clean_dname) > 40 then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;

  select id, name, code_expires_at
    into v_household
    from public.households
   where invite_code = v_clean_code
   limit 1;

  if not found then
    return json_build_object('status', 'not_found');
  end if;

  if v_household.code_expires_at <= now() then
    return json_build_object('status', 'expired');
  end if;

  if exists (
    select 1 from public.household_members
     where household_id = v_household.id
       and user_id = v_user_id
  ) then
    return json_build_object(
      'status',         'already_member',
      'household_id',   v_household.id,
      'household_name', v_household.name
    );
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (v_household.id, v_user_id, 'member', v_clean_dname);

  return json_build_object(
    'status',         'ok',
    'household_id',   v_household.id,
    'household_name', v_household.name
  );
end;
$$;

revoke all on function public.join_household_by_code(text, text) from public;
grant execute on function public.join_household_by_code(text, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Tighten INSERT policies — the two RPCs above (SECURITY DEFINER) are now the
-- only client-reachable paths to insert households or household_members rows.
-- Direct client INSERTs default-deny without an applicable policy.
-- ────────────────────────────────────────────────────────────────────────────

drop policy if exists households_insert_authenticated on public.households;

drop policy if exists household_members_insert_self on public.household_members;

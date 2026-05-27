-- Pantry Run — M17 Recurrence helper + pg_cron delivery
--
-- Three things land here:
--
-- 1. next_fire(rrule, base, tz) — timezone-aware advancement of an RRULE
--    subset (DAILY / WEEKLY+BYDAY / MONTHLY+BYMONTHDAY / YEARLY+BYMONTH).
--    Implemented in plpgsql so the cron tick stays self-contained — no JS
--    bridge for the server side. The client mirrors this logic in
--    src/lib/recurrence.ts for the "Next 3 fires:" preview.
--
-- 2. fire_due_reminders() — claims due rows (FOR UPDATE SKIP LOCKED), inserts
--    a reminder_fires row for each, advances next_fire_at via next_fire(),
--    deactivates one-shots, then posts the new fire ids to the Next.js cron
--    route via pg_net. The route reads back the rows and fans out push.
--
-- 3. pg_cron schedule — every minute, calls fire_due_reminders().
--
-- Configuration:
--   The function reads two keys from public.app_settings:
--     fire_reminders_endpoint — full URL of /api/cron/fire-reminders
--     cron_secret             — bearer token the route validates
--   The table has no RLS policies so authenticated clients can't read it; the
--   migration role and the service-role both bypass RLS. Operators set prod
--   values via the SQL editor (service-role context). Missing keys degrade
--   gracefully — the function still advances next_fire_at and logs the
--   reminder_fires row, the POST is just skipped, so a half-configured
--   environment doesn't lose schedule progression.

create extension if not exists pg_cron with schema cron;
create extension if not exists pg_net with schema extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- app_settings — opaque server-side config. Authenticated clients have no
-- access (no policies + RLS on). Service-role + SECURITY DEFINER bypass RLS.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);

alter table public.app_settings enable row level security;

-- Default rows. Local Supabase reaches a `npm run dev` server on
-- host.docker.internal:3000. Prod: overwrite via SQL editor.
insert into public.app_settings (key, value) values
  ('fire_reminders_endpoint', 'http://host.docker.internal:3000/api/cron/fire-reminders'),
  ('cron_secret',             'local-dev-cron-secret')
on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
-- next_fire — advance one step of an RRULE in the given IANA timezone.
-- Returns NULL for one-shot reminders (null/empty rrule) and for unknown
-- FREQ values.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.next_fire(
  p_rrule text,
  p_base  timestamptz,
  p_tz    text
)
returns timestamptz
language plpgsql
immutable
as $$
declare
  v_freq        text;
  v_byday       text;
  v_bymonthday  int;
  v_bymonth     int;
  v_local       timestamp;
  v_local_next  timestamp;
  v_dow         int;
  v_days_ahead  int;
  v_target_dows int[];
  v_year        int;
  v_month       int;
  v_day         int;
  v_hour        int;
  v_min         int;
  v_dim         int;
  d             int;
begin
  if p_rrule is null or btrim(p_rrule) = '' then
    return null;
  end if;

  v_freq       := upper(coalesce(substring(p_rrule from 'FREQ=([A-Za-z]+)'), ''));
  v_byday      := upper(coalesce(substring(p_rrule from 'BYDAY=([A-Za-z,]+)'), ''));
  v_bymonthday := nullif(substring(p_rrule from 'BYMONTHDAY=(\d+)'), '')::int;
  v_bymonth    := nullif(substring(p_rrule from 'BYMONTH=(\d+)'), '')::int;

  v_local := p_base at time zone p_tz;

  if v_freq = 'DAILY' then
    v_local_next := v_local + interval '1 day';

  elsif v_freq = 'WEEKLY' then
    if v_byday = '' then
      v_local_next := v_local + interval '7 days';
    else
      v_target_dows := array(
        select case t
                 when 'MO' then 1
                 when 'TU' then 2
                 when 'WE' then 3
                 when 'TH' then 4
                 when 'FR' then 5
                 when 'SA' then 6
                 when 'SU' then 7
               end
          from unnest(string_to_array(v_byday, ',')) as t
         where t in ('MO','TU','WE','TH','FR','SA','SU')
      );
      if v_target_dows is null or array_length(v_target_dows, 1) is null then
        v_local_next := v_local + interval '7 days';
      else
        v_dow := extract(isodow from v_local)::int;
        v_days_ahead := 8;
        foreach d in array v_target_dows loop
          if d > v_dow then
            v_days_ahead := least(v_days_ahead, d - v_dow);
          else
            v_days_ahead := least(v_days_ahead, d - v_dow + 7);
          end if;
        end loop;
        v_local_next := v_local + (v_days_ahead || ' days')::interval;
      end if;
    end if;

  elsif v_freq = 'MONTHLY' then
    v_year  := extract(year  from v_local)::int;
    v_month := extract(month from v_local)::int;
    v_day   := coalesce(v_bymonthday, extract(day from v_local)::int);
    v_hour  := extract(hour from v_local)::int;
    v_min   := extract(minute from v_local)::int;
    v_month := v_month + 1;
    if v_month > 12 then
      v_month := 1;
      v_year  := v_year + 1;
    end if;
    v_dim := extract(day from (
      date_trunc('month', make_date(v_year, v_month, 1)) + interval '1 month - 1 day'
    ))::int;
    if v_day > v_dim then v_day := v_dim; end if;
    v_local_next := make_timestamp(v_year, v_month, v_day, v_hour, v_min, 0);

  elsif v_freq = 'YEARLY' then
    v_year  := extract(year  from v_local)::int + 1;
    v_month := coalesce(v_bymonth, extract(month from v_local)::int);
    v_day   := coalesce(v_bymonthday, extract(day from v_local)::int);
    v_hour  := extract(hour from v_local)::int;
    v_min   := extract(minute from v_local)::int;
    v_dim := extract(day from (
      date_trunc('month', make_date(v_year, v_month, 1)) + interval '1 month - 1 day'
    ))::int;
    if v_day > v_dim then v_day := v_dim; end if;
    v_local_next := make_timestamp(v_year, v_month, v_day, v_hour, v_min, 0);

  else
    return null;
  end if;

  return v_local_next at time zone p_tz;
end;
$$;

revoke all on function public.next_fire(text, timestamptz, text) from public;
grant execute on function public.next_fire(text, timestamptz, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- fire_due_reminders — cron tick. SECURITY DEFINER so it bypasses RLS and can
-- read every household's reminders.
--
-- Reads two keys from public.app_settings:
--   fire_reminders_endpoint  — full URL of /api/cron/fire-reminders
--   cron_secret              — bearer token the route validates
--
-- Missing rows: the function still advances next_fire_at and writes the
-- reminder_fires row (status stays 'pending'). The next deploy that sets
-- the rows can pick up pending fires by querying directly — but we don't
-- try to back-deliver here. M20 close-out checklist: verify both rows are
-- set in prod.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.fire_due_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now      timestamptz := now();
  v_fire_ids uuid[]      := array[]::uuid[];
  v_fire_id  uuid;
  v_next     timestamptz;
  v_endpoint text;
  v_secret   text;
  r          record;
begin
  select value into v_endpoint from public.app_settings where key = 'fire_reminders_endpoint';
  select value into v_secret   from public.app_settings where key = 'cron_secret';
  for r in
    select rem.id,
           rem.household_id,
           rem.recurrence,
           rem.next_fire_at,
           h.timezone
      from public.reminders rem
      join public.households h on h.id = rem.household_id
     where rem.is_active = true
       and (rem.next_fire_at - make_interval(mins => rem.lead_minutes)) <= v_now
     order by rem.next_fire_at
     for update of rem skip locked
  loop
    insert into public.reminder_fires (reminder_id, household_id, fired_at, delivery_status)
    values (r.id, r.household_id, v_now, 'pending')
    returning id into v_fire_id;

    v_fire_ids := array_append(v_fire_ids, v_fire_id);

    v_next := public.next_fire(r.recurrence, r.next_fire_at, r.timezone);

    if v_next is null then
      update public.reminders
         set is_active = false
       where id = r.id;
    else
      -- Advance until next_fire_at is in the future. A reminder created with
      -- a past next_fire_at, or one whose host slept past a tick, would
      -- otherwise keep firing every cron tick until caught up. We fire once
      -- right now and skip the backlog (V2 semantics — no "missed bin nights"
      -- notification storm on resume).
      while v_next is not null and v_next <= v_now loop
        v_next := public.next_fire(r.recurrence, v_next, r.timezone);
      end loop;
      update public.reminders
         set next_fire_at = v_next
       where id = r.id;
    end if;
  end loop;

  if array_length(v_fire_ids, 1) is not null
     and v_endpoint is not null
     and v_secret is not null then
    perform net.http_post(
      url     := v_endpoint,
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || v_secret
                 ),
      body    := jsonb_build_object('fire_ids', v_fire_ids)
    );
  end if;

  return coalesce(array_length(v_fire_ids, 1), 0);
end;
$$;

revoke all on function public.fire_due_reminders() from public;

-- ────────────────────────────────────────────────────────────────────────────
-- pg_cron schedule — every minute.
--
-- The pattern `select cron.unschedule(jobid) from cron.job where jobname = …`
-- makes the migration idempotent across re-runs (db reset, dev re-apply).
-- ────────────────────────────────────────────────────────────────────────────

do $$
begin
  perform cron.unschedule(jobid)
    from cron.job
   where jobname = 'fire-due-reminders';
exception when others then
  null;
end;
$$;

select cron.schedule(
  'fire-due-reminders',
  '* * * * *',
  $cron$select public.fire_due_reminders();$cron$
);

-- Prod operators: overwrite the two app_settings rows via the SQL editor:
--   update public.app_settings set value = 'https://<your-vercel>/api/cron/fire-reminders' where key = 'fire_reminders_endpoint';
--   update public.app_settings set value = '<long-random>'                                  where key = 'cron_secret';
-- The same secret value lives in Vercel env as CRON_SECRET so /api/cron/fire-reminders
-- can validate the bearer token from the pg_net POST.

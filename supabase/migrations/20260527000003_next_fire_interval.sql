-- Pantry Run — M17 next_fire with INTERVAL support
--
-- Adds RRULE INTERVAL handling to public.next_fire(). The original M17
-- migration only advanced WEEKLY by 7 days regardless of INTERVAL, which
-- meant a rule like FREQ=WEEKLY;BYDAY=TH;INTERVAL=2 (fortnightly Thursday)
-- silently became weekly.
--
-- Australian payroll + rent cycles are overwhelmingly fortnightly. This
-- migration teaches next_fire() to honour INTERVAL on WEEKLY so the
-- Fortnightly preset works end-to-end.
--
-- Why only WEEKLY here:
--   - DAILY+INTERVAL is uncommon for household reminders ("every other day"
--     is rare); not in V2.
--   - MONTHLY/YEARLY+INTERVAL is plausible but also rare and not in the V2
--     UI. Easy to extend later when the preset list grows.
--
-- For multi-day BYDAY + INTERVAL>1 (e.g. every other week on Mon+Wed) the
-- formula `v_days_ahead + 7*(interval-1)` is not strictly RRULE-compliant
-- (it doesn't iterate through the BYDAY list within the same on-week before
-- jumping). V2 only exposes single-day Fortnightly so the imperfect path is
-- unreachable from the UI; documenting here so a future change knows the
-- semantics to revisit.

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
  v_interval    int;
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
  v_interval   := greatest(coalesce(nullif(substring(p_rrule from 'INTERVAL=(\d+)'), '')::int, 1), 1);

  v_local := p_base at time zone p_tz;

  if v_freq = 'DAILY' then
    v_local_next := v_local + interval '1 day';

  elsif v_freq = 'WEEKLY' then
    if v_byday = '' then
      v_local_next := v_local + ((7 * v_interval) || ' days')::interval;
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
        v_local_next := v_local + ((7 * v_interval) || ' days')::interval;
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
        -- For INTERVAL>1: tack on (INTERVAL-1) extra weeks after the next
        -- BYDAY match. Correct for single-day BYDAY (the V2 Fortnightly
        -- preset); for multi-day + interval>1 see the header note.
        v_local_next := v_local + ((v_days_ahead + 7 * (v_interval - 1)) || ' days')::interval;
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

-- Pantry Run — M17 Household Reminders
--
-- New primitive: scheduled, recurring notifications anchored to the household
-- timezone. See CLAUDE.md §17 for the full architecture (RRULE subset,
-- next_fire helper, pg_cron + pg_net delivery path).
--
-- Two tables:
--   reminders        — the schedule. One row per "every Thursday is bin night".
--   reminder_fires   — append-only log. One row per push fan-out tick.
--
-- next_fire_at semantics: stores the *event* time in UTC, not "fire moment".
-- The cron compares (next_fire_at - lead_minutes) <= now() so editing lead
-- minutes doesn't require recomputing next_fire_at (M17 D7).

create table public.reminders (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  notes         text check (notes is null or char_length(notes) <= 500),
  -- RRULE subset stored as opaque text. Empty/null = one-shot reminder.
  -- Recognised: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY with BYDAY/BYMONTHDAY/BYMONTH
  -- modifiers. See public.next_fire() for the full vocabulary.
  recurrence    text check (recurrence is null or char_length(recurrence) <= 200),
  next_fire_at  timestamptz not null,
  lead_minutes  integer not null default 0
                  check (lead_minutes between 0 and 10080), -- 0..7 days
  assignee_id   uuid references auth.users (id) on delete set null,
  is_active     boolean not null default true,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Cron tick scans active reminders ordered by next_fire_at. This index plus
-- the (next_fire_at - lead_minutes <= now()) predicate is the hot read path.
create index reminders_active_next_fire_idx
  on public.reminders (next_fire_at)
  where is_active = true;

create index reminders_household_id_idx
  on public.reminders (household_id);

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

create table public.reminder_fires (
  id              uuid primary key default gen_random_uuid(),
  reminder_id     uuid not null references public.reminders (id) on delete cascade,
  household_id    uuid not null references public.households (id) on delete cascade,
  fired_at        timestamptz not null default now(),
  delivery_status text not null default 'pending'
                    check (delivery_status in (
                      'pending', 'sent', 'failed', 'no_subscriptions'
                    )),
  delivery_detail text check (delivery_detail is null or char_length(delivery_detail) <= 200)
);

create index reminder_fires_reminder_id_idx
  on public.reminder_fires (reminder_id, fired_at desc);

create index reminder_fires_pending_idx
  on public.reminder_fires (id)
  where delivery_status = 'pending';

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
--
-- Reminders: household members full-CRUD.
-- Reminder fires: SELECT-only for household members. Writes happen via
-- fire_due_reminders() (SECURITY DEFINER) and the cron route (service-role).
-- ────────────────────────────────────────────────────────────────────────────

alter table public.reminders      enable row level security;
alter table public.reminder_fires enable row level security;

create policy reminders_select_members
  on public.reminders for select
  to authenticated
  using (public.is_household_member(household_id));

create policy reminders_insert_members
  on public.reminders for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy reminders_update_members
  on public.reminders for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy reminders_delete_members
  on public.reminders for delete
  to authenticated
  using (public.is_household_member(household_id));

create policy reminder_fires_select_members
  on public.reminder_fires for select
  to authenticated
  using (public.is_household_member(household_id));

-- ────────────────────────────────────────────────────────────────────────────
-- Realtime — full row payloads so the useReminders hook can apply payload.new
-- without re-fetching.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.reminders      replica identity full;
alter table public.reminder_fires replica identity full;

alter publication supabase_realtime add table
  public.reminders,
  public.reminder_fires;

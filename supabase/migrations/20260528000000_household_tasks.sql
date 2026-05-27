-- Pantry Run — M18 Household Tasks
--
-- New primitive: assignable, due-dated chores. Mirrors M17 reminders in shape
-- (per-household, full-CRUD for members, realtime) but has no scheduler — a
-- task is "done when someone marks it done", not "fires at time T". Recurring
-- tasks are deliberately deferred to V2.1 (plan.md §M18) — a truly scheduled
-- chore fits the reminder primitive better.
--
-- See CLAUDE.md §18 for the full architecture (assignment-push pathway,
-- offline queue extension, BottomNav badge).

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  notes         text check (notes is null or char_length(notes) <= 500),
  -- assignee + completer + creator are all "former member"-safe — set null on
  -- the user disappearing so the row outlives the membership. The UI shows
  -- "Unassigned (former member)" using the M3.5 snapshot pattern.
  assignee_id   uuid references auth.users (id) on delete set null,
  -- Date-only (no time). All-day fields are simpler to reason about across
  -- timezones than "due at 5pm" — and tasks aren't fire-and-forget anyway.
  due_date      date,
  is_completed  boolean not null default false,
  completed_at  timestamptz,
  completed_by  uuid references auth.users (id) on delete set null,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Paired-flag integrity: completed_at must accompany is_completed=true.
  -- completed_by may still be null if the completer has since left.
  constraint tasks_completion_consistent check (
    (is_completed = false and completed_at is null)
    or (is_completed = true and completed_at is not null)
  )
);

-- Hot read path 1: PlanTasksView's Open bucket — sorted by due_date asc
-- (nulls last) inside a household. Partial on is_completed = false keeps the
-- index tiny on long-lived households (most rows will eventually be completed).
create index tasks_household_open_due_idx
  on public.tasks (household_id, due_date asc nulls last)
  where is_completed = false;

-- Hot read path 2: PlanTasksView's Completed bucket — most-recently-completed
-- first, with the M18 hook applying a 30-day cutoff in the WHERE.
create index tasks_household_completed_idx
  on public.tasks (household_id, completed_at desc)
  where is_completed = true;

-- Hot read path 3: BottomNav Plan-tab badge — open tasks assigned to a given
-- user. The Realtime store also derives this client-side, but the index keeps
-- the initial fetch cheap if we ever query by assignee directly.
create index tasks_assignee_open_idx
  on public.tasks (assignee_id)
  where is_completed = false and assignee_id is not null;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security — household members full-CRUD. Matches M17 reminders.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.tasks enable row level security;

create policy tasks_select_members
  on public.tasks for select
  to authenticated
  using (public.is_household_member(household_id));

create policy tasks_insert_members
  on public.tasks for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy tasks_update_members
  on public.tasks for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy tasks_delete_members
  on public.tasks for delete
  to authenticated
  using (public.is_household_member(household_id));

-- ────────────────────────────────────────────────────────────────────────────
-- Realtime — full row payloads so TasksRealtime can apply payload.new without
-- re-fetching. Matches the M17 reminders + M15 list_items pattern.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.tasks replica identity full;

alter publication supabase_realtime add table public.tasks;

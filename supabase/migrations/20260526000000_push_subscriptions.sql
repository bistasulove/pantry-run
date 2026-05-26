-- Pantry Run — M16 Push Notifications Infrastructure
--
-- One row per (user, browser/device endpoint). The Web Push protocol identifies
-- a destination by its endpoint URL plus a pair of crypto keys (p256dh + auth)
-- supplied by the browser's PushSubscription. We persist all three so the
-- server-side sender (lib/push/send.ts via web-push) can encrypt + post payloads
-- without re-prompting the user.
--
-- household_id is denormalised for fan-out queries: M17 reminder cron and M18
-- task-assignment both need "all subs for household X." Computing this via a
-- join against household_members on every send costs more than syncing it
-- here. Sync happens at the application layer — every /api/push/subscribe call
-- writes the current household_id, and the hook re-POSTs on app boot, so a
-- user changing households self-heals on next open.
--
-- RLS: users can only see / modify their own subscription rows. The send
-- helper uses the service-role client to bypass RLS for cross-user fan-out.

create table public.push_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  household_id       uuid not null references public.households (id) on delete cascade,
  endpoint           text not null check (char_length(endpoint) between 1 and 1024),
  p256dh             text not null check (char_length(p256dh) between 1 and 256),
  auth               text not null check (char_length(auth) between 1 and 64),
  user_agent_label   text check (user_agent_label is null or char_length(user_agent_label) <= 80),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Fan-out index. M17 reminder cron + M18 task assignment will select by
-- household_id; everything else (device list, unsubscribe) selects by id or
-- user_id which the unique index already covers.
create index push_subscriptions_household_id_idx
  on public.push_subscriptions (household_id);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
--
-- User can SELECT / INSERT / UPDATE / DELETE their own rows. Service-role
-- bypasses for fan-out sends. No household_member visibility — a user's
-- registered devices are their own business.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own
  on public.push_subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy push_subscriptions_update_own
  on public.push_subscriptions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = (select auth.uid()));

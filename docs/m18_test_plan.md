# M18 — Household Tasks Test Plan

Last updated: 2026-05-28 (M18 close).

Mirrors the M14/M17 test-plan format. The automated path (`npm run type-check`, `npm run lint`, `npm run format`) is assumed green before any item below runs. This document tracks the **manual + integration** sweeps that aren't covered by static analysis.

---

## 1. Schema + RLS smoke (dev-time, automated)

- ✅ Migration `20260528000000_household_tasks.sql` applies cleanly via `npx supabase db reset` and `npx supabase db push`.
- ✅ `tasks` table created with the 13 columns + 3 partial indexes + `set_updated_at` trigger.
- ✅ Check constraint `tasks_completion_consistent`: an `INSERT` with `is_completed=true, completed_at=null` is rejected. (`SQLSTATE 23514`)
- ✅ RLS: a member of household A cannot SELECT/UPDATE/DELETE a task belonging to household B (`SELECT count(*) = 0`).
- ✅ RLS: a member CAN insert/update/delete tasks in their own household.
- ✅ `assignee_id ON DELETE SET NULL`: deleting an `auth.users` row clears the assignee column without dropping the task. (Tested in a transaction, rolled back.)
- ✅ `replica identity full` on `tasks` + presence in `supabase_realtime` publication confirmed.

---

## 2. Manual UI sweeps (to run before V2 launch)

### 2a. Create the first task from the empty state

1. Sign in to a household that has zero tasks.
2. Open `/plan`, tap the `Tasks` segment. Expect: the Tasks empty state with three example chips (`Mow the lawn`, `Empty the dishwasher`, `Top up the laundry detergent`) and a `Start from scratch` ghost.
3. Tap `Try "Mow the lawn"`. Expect: the edit sheet pre-fills title and a due date ~6 days out. Assignee is `Unassigned`.
4. Pick yourself as the assignee. Save. Toast `Task created`. The list now shows one row under `Open`.
5. The BottomNav Plan tab badge increments to `1`.

### 2b. Edit a task

1. Tap an existing task row's **body** (not the checkbox). The edit sheet opens with the current values.
2. Change the title. Save. Expect: `Task saved` toast; the list row updates.
3. Re-open. The new title round-trips cleanly.

### 2c. Complete + uncomplete

1. Tap the checkbox tap zone (48px square on the left of a row). The row's title gets struck through and moves into `Completed`.
2. Expand the Completed bucket via the section header. Verify the row shows "Xm ago".
3. Tap the checkbox again to uncomplete. Row moves back to Open.
4. Multi-device: A taps the checkbox. B should see the row transition under their own filter view within ~1s (Realtime).

### 2d. Filter chips

1. With ≥1 task assigned to you + ≥1 unassigned + ≥1 overdue (due_date in the past), open Tasks.
2. Tap `Mine`. Expect: only your-assigned open + completed tasks. Count badge matches (e.g. `Mine · 2`).
3. Tap `Unassigned`. Expect: only tasks with `assignee_id IS NULL`.
4. Tap `Overdue`. Expect: only open tasks with `due_date < today`. Each row's due-date pill renders in destructive red ("Overdue · Nd").
5. Tap `All`. Reset.
6. Keyboard: focus the active chip, press `ArrowRight` / `ArrowLeft` — focus and selection move in lockstep.
7. Narrow viewport (≤340px): chips scroll horizontally with no visible scrollbar; the last chip is not clipped on iOS.

### 2e. Delete

1. Open an existing task. Tap `Delete task`.
2. Toast `Task deleted`. The row vanishes locally and on every other device via Realtime.

---

## 3. Push assignment pipeline (end-to-end on a real device)

The highest-value sweep — verifies the full path from `useTasks.createTask` → `/api/push/task-assigned` → `sendToUser` → SW `push` event → OS notification → `notificationclick` deep-link.

1. **Pre-req:** install the PWA on a real device (iPhone or Android), sign in, accept notification permission via Settings → Notifications → Enable. Confirm at least one push device row in `select user_agent_label, created_at from push_subscriptions where user_id = auth.uid();`.
2. From a **different** browser session (a second device, or an incognito window signed in as another member of the same household):
   - Open `/plan`, switch to Tasks.
   - Tap `New`. Title: `Test push from desktop`. Assignee: the device-A user. Save.
3. **Expected on device A:** OS push lands within ~5s. Notification title is the task title; body is `<actor> assigned: Test push from desktop`.
4. Tap the notification. The PWA opens to `/plan?tab=tasks&focus=<id>`; the edit sheet opens for that exact task.
5. From device A, edit the same task and change the assignee to a third member. Save. **Expected:** the third member's device receives a push; device A receives nothing (the assignment did not change to them).
6. Edit the task again — change the title only, leave assignee unchanged. **Expected:** no push fires (no-op reassign).
7. Set the assignee to `Unassigned`. Save. **Expected:** no push fires.

### 3a. Push API edge cases

- POST `/api/push/task-assigned` with no body → `400 invalid_json`.
- POST with `{ task_id: "not-a-uuid" }` → `400` (RLS will hide the row even without strict validation; either way no send).
- POST as a non-member of the task's household → `404 not_found` (RLS hides the row, `maybeSingle` returns null).
- POST against a task with `assignee_id = null` → `200 { ok: true, sent: 0, skipped: true }`.
- POST as an assignee whose only device's subscription has been invalidated (manually delete the `push_subscriptions` row) → `200 { sent: 0, expired: 0, failed: 0 }`. No throw.

---

## 4. Offline + queue drain

The M5 / M11 / M15 offline pattern extends to tasks via the existing IndexedDB queue. Three new kinds: `task_create`, `task_update`, `task_delete`.

### 4a. Offline create

1. With DevTools network set to `Offline`, tap `New` in Tasks. Title: `Offline test`. Assign to a member. Save.
2. **Expected:** the toast `Task created` appears; the row appears in `Open` immediately (optimistic). OfflineBanner shows `Syncing 1 change(s)…`.
3. Re-enable network. Within ~2s the queue drains. The row's id is now in the DB; another member's device sees the row via Realtime; the assigned member receives the push.

### 4b. Offline complete

1. With network online, complete an existing task → undo (uncomplete it) → go offline → complete again.
2. **Expected:** the queue holds a `task_update` with the completion patch; on reconnect it drains and the row stays completed everywhere.

### 4c. Offline edit + delete

1. Offline-edit a task title → offline-delete a different task → reconnect.
2. **Expected:** both ops drain in FIFO order; the title edit lands, the deleted row vanishes everywhere.

### 4d. Conflict scenario

1. Device A goes offline. Device A edits task X's title to "A".
2. Device B (online) edits the same task's title to "B" then completes it.
3. Device A reconnects.
4. **Expected (last-write-wins by updated_at):** device A's queued edit overwrites "B" → "A". Completion stays (different field, not in A's patch). Both devices end consistent within ~2s via Realtime echo.

---

## 5. Cross-cutting edge cases (M18 deliverable + M20 prep)

- **Assignee leaves household.** Member B is the assignee of task T. B leaves the household. The row's `assignee_id` becomes `NULL` (ON DELETE SET NULL on the FK). Other members see the task row with `Unassigned`; the row is **not** removed.
- **Completer leaves household.** B completes task T, then leaves. The row stays completed; `completed_by` becomes `NULL`. The row still surfaces in the Completed bucket within the 30-day window.
- **30-day cutoff.** A task completed 31+ days ago is dropped from the next `fetchAll` and is no longer in the store. Realtime UPDATE for that ancient row still flows in if it happens (defensive, see TasksRealtime comment).
- **Backgrounded tab reconnect.** Background a session for ≥5 minutes; bring back to foreground. `TasksRealtime` re-fetches on `online`/`SUBSCRIBED`; any tasks created in the gap appear without a manual refresh.
- **Empty count states.** With 0 open mine + 0 overdue, the `Mine` / `Overdue` chips show no count suffix (never " · 0").
- **iOS Safari date picker.** The `<input type="date">` works in Safari 16.4+ (the PWA minimum). On older Safari the field falls back to text input — acceptable for V2.

---

## 6. Lighthouse + cross-browser (M20 will re-run; M18 sanity)

- `/plan?tab=tasks` Lighthouse: Performance ≥ 85, Accessibility ≥ 90.
- Tap-target audit: every interactive element (checkbox, row body, filter chip, FAB, sheet inputs) ≥ 44×44 with no overlap.
- Reduced motion: with `prefers-reduced-motion: reduce` set, the filter-chip colour transitions collapse to 0ms; no jarring scroll jumps in the chip rail.

---

## 7. Deployment notes

M18 adds **no new env vars** and **no new cron jobs**. The migration is the only deployment artefact:

1. CI merges the M18 PR; Vercel auto-deploys.
2. `npx supabase db push` against prod runs the migration (already pushed during dev per `feedback_migration_db_push`).
3. No app_settings rows to update — the M16/M17 push pipeline already has CRON_SECRET + endpoint configured.
4. First user load post-deploy lazy-creates `push_subscriptions` rows as before; nothing extra to provision.

---

## 8. Out-of-scope (V2.1 candidates surfaced during M18)

- **Recurring tasks.** Deferred per plan.md §M18 — a truly scheduled chore fits the reminder primitive better.
- **Per-type notification toggle.** All push types share the global Notifications enable/disable in Settings. If users complain, add a `notification_preferences` table in V2.1.
- **Bulk multi-select complete.** Single-tap completion is fast enough at the per-row level; multi-select adds a mode that's mostly noise for small daily todo lists.
- **Recurrence reminders for "ageing" overdue tasks.** A task overdue for 5 days does not re-fire a push. If users want this, the M19 activity feed plus a daily digest is a better path than per-task escalation.

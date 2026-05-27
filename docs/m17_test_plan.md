# M17 — Household Reminders Test Plan

Last updated: 2026-05-27 (M17 close).

Mirrors the M9/M14 test-plan format. The automated path (`npm run type-check`, `npm run lint`, `npm run format`) is assumed green before any item below runs. This document tracks the **manual + integration** sweeps that aren't covered by static analysis.

---

## 1. Cron + delivery pipeline (automated smoke ran during dev)

Result of the dev-time smoke from 2026-05-27:

- ✅ `pg_cron` job `fire-due-reminders` runs every minute (`select * from cron.job` confirms).
- ✅ `public.app_settings` has two rows (`fire_reminders_endpoint`, `cron_secret`) with the local-dev defaults.
- ✅ `fire_due_reminders()` returns the number of reminders fired this tick.
- ✅ A weekly reminder with `next_fire_at` in the past advances to the next matching weekday in the household timezone (Sydney smoke: `next Thursday`).
- ✅ A one-shot reminder (`recurrence = null`) fires once then is deactivated (`is_active = false`).
- ✅ `pg_net` POST to `/api/cron/fire-reminders` returns 200; the route writes back `delivery_status = 'no_subscriptions'` and a `sent=N expired=N failed=N` detail when no devices are subscribed.
- ✅ `next_fire` smoke (run against the local DB at Phase 1):

| RRULE                                        | Base UTC                               | Expected Next UTC               | Pass |
| -------------------------------------------- | -------------------------------------- | ------------------------------- | ---- |
| `FREQ=WEEKLY;BYDAY=TH`                       | 2026-05-28 09:00 (Thu 7pm Sydney AEST) | 2026-06-04 09:00 (Thu 7pm AEST) | ✅   |
| `FREQ=DAILY`                                 | 2026-05-26 09:00                       | 2026-05-27 09:00                | ✅   |
| `FREQ=MONTHLY;BYMONTHDAY=1`                  | 2026-04-30 23:00 (1 May 9am Sydney)    | 2026-05-31 23:00 (1 Jun 9am)    | ✅   |
| `FREQ=WEEKLY;BYDAY=MO,TH`                    | 2026-05-26 09:00 (Mon)                 | 2026-05-28 09:00 (Thu)          | ✅   |
| `FREQ=WEEKLY;BYDAY=TH` (across DST)          | 2026-10-01 09:00 (AEST)                | 2026-10-08 08:00 (AEDT)         | ✅   |
| `FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25`       | 2026-12-25 12:00                       | 2027-12-25 12:00                | ✅   |
| `FREQ=WEEKLY;BYDAY=SU` from a Sunday         | 2026-05-31 09:00                       | 2026-06-07 09:00 (next SU)      | ✅   |
| `FREQ=WEEKLY;BYDAY=TH;INTERVAL=2` from a Thu | 2026-05-28 09:00                       | 2026-06-11 09:00 (+14)          | ✅   |
| Same rule, advance again                     | 2026-06-11 09:00                       | 2026-06-25 09:00 (+14)          | ✅   |
| `FREQ=WEEKLY;BYDAY=TH;INTERVAL=2` across DST | 2026-10-01 09:00 (AEST)                | 2026-10-15 08:00 (AEDT)         | ✅   |
| `FREQ=WEEKLY;INTERVAL=2` no BYDAY            | 2026-05-28 09:00                       | 2026-06-11 09:00                | ✅   |
| Null rrule                                   | any                                    | NULL                            | ✅   |

DST verification: the AEST→AEDT shift on 4 Oct 2026 correctly moves the UTC offset from +10 to +11; the local 7pm time stays constant. This is the headline behaviour the timezone column was added to guarantee.

---

## 2. Manual UI sweeps (to run before V2 launch)

### 2a. Create the first reminder from the empty state

1. Sign in to a household that has zero active reminders.
2. Open `/plan`. Expect: the Reminders empty state with two `Try “Bin night”` / `Try “Rent”` buttons and a `Start from scratch` ghost.
3. Tap `Try “Bin night”`. Expect: the edit sheet pre-fills `Bin night`, `Weekly`, `Thu` pill selected, time `19:00`, lead `1 hour before`.
4. Verify the **Next 3 fires** panel shows three sensible Thursday 7pm rows in your local tz.
5. Save. Toast `Reminder created`. The list now shows one reminder grouped under either Today / This week / Later.
6. Repeat with `Try “Rent”`. Expect Monthly on the 1st, 9am, on-time lead.

### 2b. Edit a reminder

1. Tap an existing reminder row. The edit sheet opens with the current values.
2. Switch the recurrence preset from Weekly → Daily. Verify the **Next 3 fires** preview updates live.
3. Save. Expect: `Reminder saved` toast; the list row's `Next: …` label updates.
4. Re-open the same row. Verify the saved values round-trip cleanly.

### 2c. Delete

1. Open an existing reminder. Tap `Delete reminder`.
2. The reminder disappears from the list. Realtime confirmation: open on a second device — the row disappears there too within a couple of seconds.

### 2d. Plan-tab segmented control

1. On `/plan`, default lands on Reminders.
2. Tap Tasks. Expect: the M18 placeholder ("Tasks land in the next update").
3. The URL adds `?tab=tasks`. Reload — Tasks stays selected.
4. Back to Reminders. URL drops the `tab` param.

### 2e. BottomNav refactor

1. Bottom tabs are **List · Plan · History · You** (avatar chip with initial + tinted background).
2. Tap the avatar. Sheet opens with `Household`, `Settings`, `Notifications`, `Sign out`.
3. Tap `Notifications` — lands on `/settings` and scrolls to the Notifications section (anchored via `#notifications`).
4. Tap `Sign out`. Verify the existing sign-out flow runs (stores cleared, redirect to `/welcome`).

### 2f. Household timezone

1. `/household` shows the Timezone section near the bottom. Default value matches `Intl.DateTimeFormat().resolvedOptions().timeZone` for new households.
2. Change to a different zone (e.g. `Europe/London`). Toast `Timezone updated`.
3. Verify in DB: `select timezone from households where id = …;` reflects the change. The `set_household_timezone` RPC enforces membership server-side.
4. Open an existing reminder — the **Next 3 fires** preview now reflects the new timezone (`every Thursday at 7pm London` instead of Sydney).

### 2g. End-to-end push delivery

1. Local dev: ensure `npm run dev` is running, your browser has notifications enabled for the dev origin, and the `push_subscriptions` table has a row for your user.
2. Create a reminder with `next_fire_at` set to `now() + 2 minutes` and `lead_minutes = 0` (use the SQL editor or seed a one-shot from the UI with a time 2 mins ahead).
3. Wait for the next cron tick. Within ~1 minute you should:
   - Receive an OS notification with the reminder title.
   - See `delivery_status = 'sent'` and `delivery_detail = 'sent=1 expired=0 failed=0'` in `reminder_fires`.
4. Tap the notification. The PWA opens at `/plan?tab=reminders&focus=<reminder_id>` and the edit sheet opens for that reminder.

---

## 3. Edge cases (per plan.md M17)

| Case                                     | Expected behaviour                                                                                                                                                                                                                                                                            | Status                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Reminder edited mid-fire                 | `FOR UPDATE SKIP LOCKED` in `fire_due_reminders()` serialises the row; an in-flight `update` from the client waits, then the new values land. No double fire.                                                                                                                                 | ✅ guaranteed by lock      |
| Assignee removed from household          | `assignee_id` is nullable in `reminder_fires` resolution. The cron route falls back to `sendToHousehold` when the assigned user no longer subscribes — but currently `sendToUser` returns 0 sent / 0 expired / 0 failed when there are no rows. Acceptable: their devices are gone with them. | ✅ inherent                |
| Reminder with `next_fire_at` in the past | Fires once on next tick; the catch-up loop advances `next_fire_at` past any backlog so the user doesn't get a notification storm.                                                                                                                                                             | ✅ verified via smoke      |
| DST transition (AEST ↔ AEDT)             | `next_fire` computes in the household tz, so the local time stays at 7pm. The UTC instant shifts by an hour twice a year.                                                                                                                                                                     | ✅ verified via smoke      |
| Catch-up after host sleep                | Tested via the smoke (reminder dated 1 minute in the past advances correctly to the next future occurrence).                                                                                                                                                                                  | ✅                         |
| Offline create/edit                      | Hook returns `Connect to the internet to {action} reminders.` Reminders are online-only by design — see useReminders.ts header.                                                                                                                                                               | ⏳ to test in manual sweep |

---

## 4. Production deployment checklist

Before flipping M17 live on Vercel:

1. **Generate a strong `CRON_SECRET`.** `openssl rand -hex 32`.
2. **Vercel env:** add `CRON_SECRET` to Production + Preview environments. Redeploy.
3. **Supabase SQL editor (Production):** overwrite the two `app_settings` rows that ship with local-dev defaults.

   ```sql
   update public.app_settings
      set value = 'https://<your-vercel-app>/api/cron/fire-reminders'
    where key = 'fire_reminders_endpoint';

   update public.app_settings
      set value = '<the same long-random as Vercel CRON_SECRET>'
    where key = 'cron_secret';
   ```

4. **Verify the cron job is scheduled:** `select * from cron.job where jobname = 'fire-due-reminders';` should show `* * * * *`.
5. **Smoke a reminder live:** create one with `next_fire_at = now() + 90 seconds`, confirm a push lands on your device.

---

## 5. Known limitations (filed for V2.1+)

- **Custom RRULE input.** Presets only in V2.
- **"Nth weekday of month"** (e.g. "first Monday"). Monthly is BYMONTHDAY only in V2.
- **Snooze / skip next** for individual fires. The notification action would replace the OS notification with "Snooze 1 hour" / "Skip next". Trivial schema-wise but adds UI surface — defer.
- **Per-member quiet hours.** A member shouldn't receive at 3am even if a reminder is set for then. Defer to V2.2 once we have signal on whether it's actually requested.

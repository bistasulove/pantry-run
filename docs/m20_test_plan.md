# M20 — QA, Edge Cases & V2 Launch — Test Plan

> Release-gate manual QA for V2. Pair this with `docs/plan.md` §11.6 M20
> (scope, as trimmed at kickoff after the M19 deprioritisation) and
> `scratchpad.md` (M17 handoff — stale; rewritten at G.4 close-out).
> Tick boxes as you go. Append bug findings to §7.

---

## 1. Locked decisions (M20 kickoff)

1. **QA tracking format:** this file is the durable record;
   `scratchpad.md` for in-conversation notes only — rewritten at G.4
   close-out for the V2 → V3 handoff.
2. **`plan.md` reconciliation:** §11.6 M20 trimmed at kickoff after the
   M19 deprioritisation (see `project_m19_deprioritised`):
   - Activity-feed + smart-suggestions QA cases **cut entirely** — those
     surfaces don't exist.
   - Lighthouse routes drop to `/list` + `/plan?tab=reminders` +
     `/plan?tab=tasks` (no `/activity`).
   - Release notes ship at **four** sections (Smarter categories,
     Notifications, Reminders, Tasks), not six.
3. **Test environment:** prod-first like M14. `npm run build && npm run
start` (or Vercel preview) for installed-PWA tests; local Supabase
   only for ad-hoc cron seeding (`select fire_due_reminders();`) and
   Edge Function rate-limit forcing (E.4) where prod's counter would be
   collateral.
4. **Sentry verification:** reuse M14's `?__throw=1` + `?__reject=1`
   client seams. New V2 server-side surfaces (cron route, push routes,
   Edge Function) verified by **forcing real errors** via temporary
   config tampering on a preview env — bad
   `app_settings.fire_reminders_endpoint` for the cron path, mangled
   `VAPID_PRIVATE_KEY` for the push-send path — then reverting. No new
   `?__error=1` seam shipped.
5. **Real devices:** iPhone Safari + Android Chrome (both installed PWA)
   - macOS Chrome + macOS Safari + macOS Firefox — same set as M14.
6. **Lighthouse targets:** Performance ≥ 85, Accessibility ≥ 90, Best
   Practices ≥ 90, PWA ✓ — unchanged from M14 / M7.
7. **Release-note location:** `docs/release-notes/v2.md` — final pass
   strips "Coming next in V2" and drops the two Activity / Suggestion
   rows from "We heard you" (D5 = A, drop entirely).
8. **Bug-fix triage:** P0 / P1 fix inline (blocks ✅); P2 / P3 logged as
   V2.1 follow-ups in §7, captured in the close-out memory.
9. **Dev seam removal:** `/api/push/test` route, the `sendTest` method
   on `usePushNotifications`, the "Send test push" UI block in
   `NotificationsSection`, the `kind: 'test'` arm in `public/sw.js`,
   and the `'test'` member of `PushKind` in `src/lib/push/send.ts` —
   all removed in a single Phase-4 commit at close-out.
10. **Done-when split:** M20 ✅ when the technical sweep is clean, the
    release note is finalised, and the dev seams are removed. Real-
    household notify + "≥ 3 households tested end-to-end" (`plan.md`
    §M20 Done-when) is the developer's manual step post-merge.

---

## 2. Testing environment

### Prod-first strategy

V2 is read-mostly QA on top of M18's shipped surface, with two specific
exercises that need a local Supabase nearby:

- `npm run build && npm run start` (or a Vercel preview) for installed-
  PWA tests.
- `npm run dev` against local Supabase for:
  - **B.10 / B.11 / C.3 cron seeding** via `select fire_due_reminders();`
    — to force a reminder fire off-clock without waiting for the prod
    1-min cadence.
  - **C.6 rate-limit forcing** — without burning prod's daily counter.

### Devices

- **iPhone (Safari, installed PWA)** — primary mobile shopper; the
  iOS 16.4+ push-eligible surface.
- **Android (Chrome, installed PWA)** — secondary mobile; primary push-
  delivery smoke target.
- **macOS Chrome** — primary desktop dev surface.
- **macOS Safari** — desktop Webkit smoke.
- **macOS Firefox** — desktop Gecko smoke.

### Two-user setup

Two Chrome profiles (or Firefox containers) for multi-member flows.
Same approach as M14. A third Safari window when needed for fan-out
exclusion (B.10 device-A-doesn't-self-fire) or assignee changes.

---

## 3. Test matrix

### A. Static / preflight

- [ ] A.1 — `npm run type-check` → zero errors.
- [ ] A.2 — `npm run lint` → zero errors.
- [ ] A.3 — `npm run format` → clean diff (only this file may be flagged
      on first write).
- [ ] A.4 — `npm run build` → all routes build, no new warnings vs. M18.
- [ ] A.5 — Vercel env vars present:
  - **V1.1 carryover:** `NEXT_PUBLIC_SUPABASE_URL`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`,
    `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.
  - **V2 new:** `SUPABASE_SERVICE_ROLE_KEY` (M16 fan-out),
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` /
    `VAPID_SUBJECT` (M16), `CRON_SECRET` (M17).
  - **Supabase secrets:** `GEMINI_API_KEY` (M15 Edge Function).
- [ ] A.6 — Latest Vercel deploy uploaded source-maps (Sentry release
      detail confirms — M13 carryover).
- [ ] A.7 — `public.app_settings` rows in prod point at the live Vercel
      URL and match `CRON_SECRET`. Spot-check via Supabase SQL editor.

### B. V2 happy path (desktop Chrome, two profiles)

Profile A is the household creator; profile B joins.

**Smarter categories (M15)**

- [ ] B.1 — Profile A: add "haldi" → category lands as Pantry (LLM tier;
      cold-start 2–3 s acceptable, row flips from Other → Pantry).
- [ ] B.2 — Profile A: add "milk" → instant Dairy (keyword tier).
- [ ] B.3 — Profile A: open edit sheet for "haldi" → change category to
      Snacks → save. Re-add "haldi" on Profile B's list → lands in
      Snacks (per-household override beats LLM cache).
- [ ] B.4 — Offline: airplane-mode → add "boba pearls" → lands in Other
      with `category_pending=true`. Reconnect → row flips to the right
      category within seconds (sweep runs on `SUBSCRIBED` + `online`).

**Push notifications (M16)**

- [ ] B.5 — Profile A on Android Chrome (installed PWA): Avatar menu →
      Notifications → Enable. Permission prompt grants. "This device"
      appears with OS / browser label.
- [ ] B.6 — Profile A on iPhone Safari: install to Home Screen first,
      then same flow. iOS-needs-PWA gate confirmed when running in
      plain Safari (UI shows the install-first message).
- [ ] B.7 — Two devices subscribed for Profile A: `push_subscriptions`
      shows two rows in Studio with the correct `household_id`
      denormalisation.

**Household reminders (M17)**

- [ ] B.8 — Profile A: `/plan` (Reminders) → "Daily 9am" empty-state
      preset → save. EditSheet's "Next 3 fires" preview shows three
      correct device-tz instants.
- [ ] B.9 — Profile A: create "Bin night every Thursday at 7pm, 1 h
      before, household-wide". Profile B sees it appear via realtime
      within 1–2 s.
- [ ] B.10 — On local Supabase: seed `next_fire_at = now() + 30s` for
      the bin reminder. Wait one cron tick; push lands on both A's and
      B's enabled devices. `reminder_fires.delivery_status = 'sent'`;
      `delivery_detail` records `sent=N expired=0 failed=0`.
- [ ] B.11 — Profile A: edit the bin reminder → `assignee_id = Profile
    B`. Re-trigger fire (local). Push lands on B's devices only;
      A's devices receive nothing.
- [ ] B.12 — Profile A: tap a delivered notification → app opens at
      `/plan?tab=reminders&focus=<id>` with the edit sheet on that
      reminder.

**Household tasks (M18)**

- [ ] B.13 — Profile A: `/plan` → Tasks segment → FAB → create "Empty
      dishwasher", assignee = Profile B. Save. Profile B receives an
      assignment push within seconds: "Alex assigned: Empty
      dishwasher". Tap → `/plan?tab=tasks&focus=<id>`.
- [ ] B.14 — Profile B: complete the task from the list. Profile A
      sees completion via realtime; task moves under Completed
      (collapsed). BottomNav Plan badge decrements for B.
- [ ] B.15 — Profile A: create three unassigned tasks. Filter chips
      read All=4, Mine=0, Unassigned=3, Overdue=0. Set one to
      yesterday → Overdue=1.
- [ ] B.16 — Offline: airplane-mode → check off a task → optimistic
      complete renders immediately. Reconnect → DB confirms;
      realtime broadcasts to Profile B. (M18 offline-queue:
      `task_update` kind.)

**Bottom nav + Avatar menu (M17)**

- [ ] B.17 — BottomNav reads List / Plan / History / Avatar on all
      viewports. Plan tab badge accurately counts open tasks
      assigned to the current user (cap at "9+"). Avatar circle
      shows the deterministic-hash tint.
- [ ] B.18 — Avatar menu sheet opens via tap; rows for Household,
      Settings, Notifications (deep-link `/settings#notifications`),
      Sign out. All four targets work; sheet closes on selection.

### C. V2 edge cases

- [ ] C.1 — **Push permission revoked mid-session.** Revoke
      notifications in OS settings while the app is open. UI reflects
      "Notifications off" on next subscribe attempt. On next push
      send, server returns 410 → row deleted from `push_subscriptions`
      inline (M16 cleanup; no separate sweep job).
- [ ] C.2 — **Recurring reminder fires while every device is offline.**
      Disable wifi on both A's devices; fire on local cron. Re-enable
      wifi → push delivery best-effort. Note: Web Push retention varies
      (Chrome ~24h, Safari ~30 days). Document observed behaviour;
      missing delivery is not a regression.
- [ ] C.3 — **`next_fire_at` in the past.** Insert a reminder with
      `next_fire_at = now() - interval '1 hour'`. Next tick fires once + advances per the recurrence rule; doesn't notification-storm.
- [ ] C.4 — **DST transition.** Local Supabase: set host system clock
      to 2026-10-04 01:50 (right before AEDT starts). Create reminder
      "Sunday 02:30 weekly" — fires at the correct local time across
      the transition; UTC stored advances accordingly.
      (`project_m17_household_reminders` smoke covered the plpgsql + JS
      mirror; this is the wall-clock confirmation.)
- [ ] C.5 — **Task assignee leaves household.** Profile A creates a
      task assigned to B. B leaves → `tasks.assignee_id = NULL` via
      `ON DELETE SET NULL`. Task renders as "Unassigned"; reassignable
      from edit sheet. B's `push_subscriptions` rows are cascade-deleted.
- [ ] C.6 — **Edge Function rate-limit hit.** On local Supabase, force
      `category_request_counters.count = 150` for today's household. Add
      an unknown item → falls back to Other gracefully; no error UX.
      Count doesn't increment past 150.
- [ ] C.7 — **Bad `CRON_SECRET` → 401.**
      `curl -X POST <cron-route> -H "Authorization: Bearer wrong"` → 401.
      No `reminder_fires` rows touched.
- [ ] C.8 — **Reminder with assignee who has no push subscription.**
      Profile B never enabled notifications. Profile A creates a
      reminder assigned to B and triggers fire (local).
      `reminder_fires.delivery_status = 'no_subscriptions'`;
      `delivery_detail = 'sent=0 expired=0 failed=0'`. No error logged.

### D. Real-device sweep

For each device, run a subset of §B + relevant §C cases.

- [ ] D.1 — **iPhone Safari (installed PWA)** — install + B.5/B.6 push
      enable + B.10/B.11 reminder delivery + B.13 task assignment
      delivery + safe-area-inset visual sweep on the new Plan tab.
- [ ] D.2 — **Android Chrome (installed PWA)** — install + B.5 push
      enable + B.10/B.11 + B.13. Two-devices-same-user fan-out smoke
      (both ring on a single household push).
- [ ] D.3 — **macOS Safari (browser)** — B.1–B.4 categories +
      B.8/B.9 reminder UI smoke. macOS push works since macOS 13 in
      installed mode only — note the gate.
- [ ] D.4 — **macOS Firefox (browser)** — B.1–B.4 + B.8/B.9 + B.13
      task UI smoke (no install path).

### E. Observability — Sentry end-to-end

Mix of M14 carryover (client seams) + V2 server-side surfaces verified
by forcing real errors on a preview env.

- [ ] E.1 — `?__throw=1` on `/list` → ErrorFallback renders → Sentry
      event with `boundary=route` tag, hashed `user.id`,
      `household_id` tag, source-map-resolved frames. (Per M14 E.2.)
- [ ] E.2 — `?__reject=1` → unhandled promise rejection → Sentry event
      via default `onunhandledrejection` integration. (Per M14 E.3.)
- [ ] E.3 — **Cron failure capture.** On a Vercel preview env, set
      `public.app_settings.fire_reminders_endpoint` to an unreachable
      URL (e.g. `https://example.invalid/...`). Trigger
      `select fire_due_reminders();` locally → pg_net fails → confirm
      the failure surfaces either via Sentry (route catch) or via
      `reminder_fires.delivery_status = 'failed'` with a detail
      payload. Revert.
- [ ] E.4 — **Push send failure capture.** Temporarily mangle
      `VAPID_PRIVATE_KEY` on the preview env only. Trigger a task
      assignment with a real subscription. `web-push` throws → caught
      by `/api/push/task-assigned` → Sentry event with route tag.
      Revert.
- [ ] E.5 — **Edge Function failure capture.** Force a Gemini error
      (e.g. invalid `GEMINI_API_KEY` on preview's Supabase project) →
      Supabase function logs capture the failure. (Note: Edge Function
      Sentry integration is limited; function logs are the primary
      observability.)
- [ ] E.6 — **Rate-limit observability.** After C.6 hits the 150/day
      cap, confirm `category_request_counters` reflects the truth
      (`count=150`, `cache_misses` flat). No Sentry breadcrumb by
      design (`project_m15_smarter_categories`).

### F. Lighthouse (Chrome incognito, mobile preset, production URL)

- [ ] F.1 — `/list` — Performance ≥ 85, A11y ≥ 90, BP ≥ 90, PWA ✓.
- [ ] F.2 — `/plan?tab=reminders` — same targets.
- [ ] F.3 — `/plan?tab=tasks` — same targets.

(`/history` unchanged from V1.1 — M14 F covered it. Skip.)

### G. Release prep

- [ ] G.1 — `docs/release-notes/v2.md` finalised: four household-
      friendly sections (Smarter categories, Notifications, Reminders,
      Tasks), no "Coming next in V2" section, "We heard you" table
      trimmed of Activity / Suggestion rows (D5=A). _(Lead paragraph + table updates applied at M20 Phase 2 — re-verify nothing
      regressed during the sweep.)_
- [ ] G.2 — Supabase project under free-tier limits (DB < 500 MB,
      MAU < 50K, realtime conn < 200).
- [ ] G.3 — Vercel production deploy green on the post-Phase-4 commit
      (dev seams removed).
- [ ] G.4 — `scratchpad.md` rewritten for V2 launch handoff (mirrors
      M14 V1.1 → V2 handoff; flags V2.1 candidates + P2/P3 follow-ups
      from §7).
- [ ] G.5 — `CLAUDE.md` §2 marker → "none — V2 shipped"; M20 row → ✅
      Done.
- [ ] G.6 — Production deployment checklist (§4) completed.

---

## 4. Production deployment checklist

Technical sweep ✅ doesn't mean prod is ready. Before the final cut:

**Vercel (Production + Preview):**

- [ ] `CRON_SECRET` set; matches `public.app_settings.cron_secret` in
      prod.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (M16 fan-out via
      `src/lib/supabase/admin.ts`).
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` +
      `VAPID_SUBJECT` set. Generated once via
      `npx web-push generate-vapid-keys --json` and reused —
      regenerating invalidates existing `push_subscriptions`.
- [ ] M13 carryover present: `SENTRY_ORG`, `SENTRY_PROJECT`,
      `SENTRY_AUTH_TOKEN`.

**Supabase:**

- [ ] `GEMINI_API_KEY` set as secret
      (`npx supabase secrets set GEMINI_API_KEY=…`).
- [ ] `public.app_settings.fire_reminders_endpoint` → live Vercel URL
      (`https://<your-vercel>/api/cron/fire-reminders`).
- [ ] `public.app_settings.cron_secret` → strong value
      (`openssl rand -hex 32`); matches Vercel `CRON_SECRET`.
- [ ] `pg_cron` schedule active — `select * from cron.job;` shows
      `fire_due_reminders` at the 1-min cadence.

**Post-deploy smoke:**

- [ ] `/api/push/test` returns 404 (dev seam removed).
- [ ] First reminder fire end-to-end on prod arrives on a real device.

---

## 5. Out of scope / not blocking M20

- Activity feed — **deprioritised 2026-05-31**
  (`project_m19_deprioritised`).
- Smart suggestions — deprioritised 2026-05-31.
- Recurring tasks — V2.1 candidate (`plan.md` §11.6 closing note).
- Custom RRULE input — V2.1 candidate.
- React Native port — V3.
- Cross-device DST acceptance window — wait for Australia's 2026-10-04
  AEDT entry for the natural wall-clock confirmation; C.4 covers the
  synthetic case.

---

## 6. Known limitations / acceptance notes

- **Web Push retention varies by browser.** Chrome ~24 h, Safari
  ~30 days. A reminder that fires while every device is offline may
  not arrive even after reconnect — depends on browser. C.2 documents
  observed behaviour; missed delivery is not a regression.
- **iOS push works only for installed PWAs.** Apple's constraint, not
  ours. Settings → Notifications shows a clear gate when running in
  plain Safari.
- **Edge Function cold start ~2–3 s.** Inherent to Deno isolate boot
  from AU → Seoul region. Acceptable; warm calls run 300–600 ms.
  (`project_m15_smarter_categories`.)
- **First-paint Sentry attribution.** First session per device still
  misses the user tag — SHA-256 hash isn't cached yet (M13 D3).
  Accepted.
- **Categorisation rate-limit is per-household.** 150 LLM calls/day.
  In practice no household has come close (`project_m15`).

---

## 7. Bugs found during sweep

> Append findings here as they surface. Severity P0–P3.
> P0/P1 block ✅; P2/P3 logged as V2.1 follow-ups.

_(empty at start)_

---

## 8. Sign-off

- [ ] All P0/P1 boxes ticked or rejected with rationale.
- [ ] All P2/P3 items either fixed or logged as V2.1 follow-ups.
- [ ] Release note finalised (`docs/release-notes/v2.md`).
- [ ] Production deployment checklist (§4) completed.
- [ ] Memory + scratchpad close-out commit pushed.

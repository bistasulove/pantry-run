# M14 — QA, Edge Cases & V1.1 Launch — Test Plan

> Release-gate manual QA for V1.1. Pair this with `docs/plan.md` §11.5 M14
> (scope, as amended at kickoff) and `scratchpad.md` (M13 handoff context).
> Tick boxes as you go. Append bug findings to §6.

---

## 1. Locked decisions (M14 kickoff)

1. **QA tracking format:** this file is the durable record; `scratchpad.md`
   for in-conversation notes only.
2. **`plan.md` reconciliation:** §11.5 M14 amended at kickoff —
   - Google OAuth callback test **cut** (Google Sign-In descoped to V2 in M9).
   - "Account upgrade with offline pending writes — queued and replayed"
     **rewritten** to "Offline account upgrade attempt — blocked with a
     friendly message" (matches what M9 actually shipped per
     `project_m9_auth_upgrade`).
3. **Real devices:** iPhone Safari + Android Chrome + macOS Safari/Chrome/
   Firefox — all on hand.
4. **Sentry verification seams:** two temporary query-string handlers
   (`?__throw=1` for the route error boundary; `?__reject=1` for an
   unhandled promise rejection), removed in the close-out commit. Mirrors
   the M13 verification-seam pattern.
5. **Lighthouse targets:** Performance ≥ 85, Accessibility ≥ 90, Best
   Practices ≥ 90, PWA ✓ (same as M7).
6. **Release-note location:** `docs/release-notes/v1.1.md` — source of
   truth in repo, manually distributed by the developer.
7. **Bug-fix triage:** P0 / P1 fix inline (blocks ✅); P2 / P3 logged
   as follow-ups in §6.
8. **Done-when split:** M14 ✅ when the technical sweep is clean + release
   note drafted. Real-household notify + "≥ 2 households tested" (plan.md
   "Done when") is the developer's manual step post-merge.

---

## 2. Testing environment

### Prod-first strategy

Unlike M9 (which needed Inbucket to avoid the email-throttle), M14 is a
read-mostly QA pass — no schema work, only one email-burning step (B.12).
Test against production:

- `npm run build && npm run start` (or push to a Vercel preview) for
  installed-PWA tests.
- `npm run dev` against local Supabase for the **concurrent Finish
  Shopping** test (C.4) — easier to script two tabs against a local DB
  and inspect the result without affecting prod data.

### Devices

- **iPhone (Safari, installed PWA)** — primary mobile shopper target.
- **Android (Chrome, installed PWA)** — secondary mobile.
- **macOS Chrome** — primary desktop dev surface.
- **macOS Safari** — desktop Webkit smoke.
- **macOS Firefox** — desktop Gecko smoke.

### Two-user setup

Two Chrome profiles (or Firefox containers) for multi-member flows; Safari
as a third "guest" when needed. Same approach as M9.

---

## 3. Test matrix

### A. Static / preflight

- [x] A.1 — `npm run type-check` → zero errors. _(2026-05-24)_
- [x] A.2 — `npm run lint` → zero errors. _(2026-05-24)_
- [x] A.3 — `npm run format` → clean diff applied to `docs/m14_test_plan.md`
      (the new tracker — itself flagged on first write); no other files
      touched. _(2026-05-24)_
- [x] A.4 — `npm run build` → 15 routes, no new warnings vs. M13.
      _(2026-05-24)_
- [x] A.5 — Vercel env vars present: `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`,
      `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.
      _(2026-05-24)_
- [x] A.6 — Latest Vercel deploy uploaded source-maps (Sentry release
      detail confirms). _(2026-05-24)_

### B. V1.1 happy path (desktop Chrome, two profiles)

Profile A is the household creator; profile B joins.

- [x] B.1 — Profile A: `/welcome` → enter name → "Create household" →
      `/create` → enter household name → `/list` (empty state).
- [x] B.2 — Profile A: invite code visible on `/household`; valid for
      7 days (M3.5 F4).
- [x] B.3 — Profile B (incognito): `/welcome` → "Join household" → enter
      invite code → `/list`. Both profiles show the same household name.
- [x] B.4 — Profile A: add three items via the quick-add bar. Profile B
      sees them appear within 1–2 s.
- [x] B.5 — Profile A: open edit sheet → set quantity (e.g. `2 kg`) +
      note. Both fields render on the list row; `piece` unit renders as
      "Qty" per `project_m8_quantity_schema`. Profile B reflects.
- [x] B.6 — Profile A: open the list switcher → "+ New list" → "Costco
      Run". Switcher now shows two lists; active list defaults to the
      new one (per `project_m10_multi_list`: `pr_active_list` cookie).
- [x] B.7 — Profile A: add an item to Costco Run; switch back to
      Shopping List; Costco item is NOT visible. Switch again; back.
      Realtime rescopes (old channel torn down in Network → WS tab).
- [x] B.8 — Profile A: edit an item → "Mark as staple" → indicator
      visible on list row. First-time toast (per
      `pr_seen_staple_hint`) appears explaining behaviour.
- [x] B.9 — Profile A: check off all items. "Finish shopping" enabled;
      confirmation preview shows "X items will be removed, Y staples
      will stay". Confirm. Non-recurring items removed; staples remain
      unchecked. One `shopping_trips` row appears in Studio.
- [x] B.10 — Profile A: Clock tab → `/history` → trip appears with
      finisher name + item count. Tap → trip detail sheet shows all
      snapshot items (quantity, note, category preserved).
- [x] B.11 — Profile A: from the detail sheet, "Add to current list" on
      one item → item lands on active list with fresh `created_at`.
      Restore a second item; both appear (per `project_m12_history`:
      `useList.restoreItem` is offline-queue-compatible).
- [x] B.12 — Profile A: Settings → "Save your account" → email + password
      (≥ 8 chars) → confirmation toast. Confirm via real inbox (prod
      smoke). Settings now shows email + "Email" provider + "Sign out".
- [x] B.13 — Profile A: sign out → `/welcome`. Sign in (cleared profile)
      with same creds → `/list` shows household + items intact.

### C. V1.1 edge cases (plan.md §11.5 M14, amended)

- [x] C.1 — **Active-list switch while offline.** _(2026-05-24)_
- [x] C.2 — **Recurring-only list → Finish shopping disabled.**
      _(2026-05-24)_
- [x] C.3 — **History restore when source list deleted.** _(2026-05-24)_
- [x] C.4 — **Concurrent Finish Shopping, two members same list.**
      _(2026-05-24)_
- [x] C.5 — **Offline account upgrade attempt (amended).** _(2026-05-24)_
- [x] C.6 — **Two people add the same item simultaneously.**
      _(2026-05-24)_
- [x] C.7 — **Very long item name.** _(2026-05-24)_
- [x] C.8 — **Page closed mid-sync.** _(2026-05-24)_
- [x] C.9 — **Invite code expiry + regen.** _(2026-05-24)_
- [x] C.10 — **Keyboard dismissed mid-animation** (iOS Safari).
      _(2026-05-24)_

### D. Real-device sweep

For each device, run a subset of §B + the most relevant §C cases.

- [x] D.1 — **iPhone Safari (installed PWA)** — install + happy-path
      subset incl. safe areas, keyboard, save-account return-to-PWA,
      staple/finish/history/restore. _(2026-05-24)_
- [x] D.2 — **Android Chrome (installed PWA)** — install banner +
      happy-path subset. _(2026-05-24)_
- [x] D.3 — **macOS Safari (browser)** — happy-path subset.
      _(2026-05-24)_
- [x] D.4 — **macOS Firefox (browser)** — happy-path subset.
      _(2026-05-24)_

### E. Observability — Sentry end-to-end

Temporary verification seams added on a branch, removed at close-out.

- [x] E.1 — Seams shipped to master (`11bdc5e`); Vercel auto-deployed
      to prod. _(2026-05-24)_
- [x] E.2 — `?__throw=1` on `/list` → ErrorFallback renders → Sentry
      event arrives with `boundary=route` tag, hashed `user.id`,
      `household_id` tag, source-map-resolved frames. _(2026-05-24)_
- [x] E.3 — `?__reject=1` → unhandled promise rejection → Sentry event
      arrives via default `onunhandledrejection` integration.
      _(2026-05-24)_
- [x] E.4 — Seams removed (`4bc10a0`); new prod deploy smoke-tested —
      `?__throw=1` and `?__reject=1` are both no-ops. _(2026-05-24)_

### F. Lighthouse (Chrome incognito, mobile preset, production URL)

- [x] F.1 — Performance ≥ 85. _(2026-05-24)_
- [x] F.2 — Accessibility ≥ 90. _(2026-05-24)_
- [x] F.3 — Best Practices ≥ 90. _(2026-05-24)_
- [x] F.4 — PWA ✓ (installable, manifest, service worker).
      _(2026-05-24)_

### G. Release prep

- [x] G.1 — `docs/release-notes/v1.1.md` drafted: five household-friendly
      sections (Save your account, Quantity & notes, Multiple lists,
      Staples & Finish shopping, Shopping history) + how-to-update note.
      M13 (Sentry) intentionally omitted — invisible to end users.
      _(2026-05-24)_
- [x] G.2 — Supabase project under free-tier limits (DB < 500 MB,
      MAU < 50K, realtime conn < 200). _(2026-05-24)_
- [x] G.3 — Vercel production deploy green on `4bc10a0`
      (seams-removed). _(2026-05-24)_
- [x] G.4 — `scratchpad.md` rewritten for V1.1 → V2 handoff.
      _(2026-05-24)_
- [x] G.5 — `CLAUDE.md` §2 marker → "none — V1.1 shipped; V2 up
      next"; M14 row → ✅. _(2026-05-24)_

---

## 4. Out of scope / not blocking M14

- Smart suggestions / activity feed — V2.
- Google Sign-In — V2 (descoped from M9, removed from M14 scope at
  kickoff).
- Push notifications — V2.
- Native (Expo) app — V2/V3.
- Custom domain on Vercel — optional, doesn't block ✅.

---

## 5. Known limitations / acceptance notes

- Real-household rollout ("notify all 10 households, ≥ 2 test end-to-
  end") is a manual post-merge step. Tracked separately from the
  technical sweep.
- First-paint Sentry attribution: the very first session per device
  still misses the user tag because the SHA-256 hash isn't cached yet
  (per `project_m13_sentry` D3). Accepted.

---

## 6. Bugs found during sweep

> Append findings here as they surface. Severity P0–P3.
> P0/P1 block ✅; P2/P3 logged as follow-ups.

_(empty at start)_

---

## 7. Sign-off

- [x] All P0/P1 boxes ticked or rejected with rationale. _(none found)_
- [x] All P2/P3 items either fixed or logged as follow-ups. _(none found)_
- [x] Release note drafted. _(`docs/release-notes/v1.1.md`)_
- [x] Memory + scratchpad close-out commit pushed.

# M9 — Manual Test Plan

> Solo-dev manual QA for the Full Account Upgrade milestone. Pair this with
> `docs/plan.md` §11.5 M9 (scope) and the saved memory `project_m9_auth_upgrade`
> (locked decisions). Tick boxes as you go.

---

## 1. Testing Strategy

### Why local Supabase

Supabase's free-tier email throttle is ~4 emails/hour. Every `updateUser({ email })`
and `resetPasswordForEmail` sends one — solo manual testing blows through the
quota in 15 minutes.

`npx supabase start` runs the whole stack in Docker, including **Inbucket**
(a fake SMTP server) at `http://localhost:54324`. Emails are captured there,
never sent, no rate limits.

```bash
npx supabase start                    # one-time, ~30s startup
npx supabase status                   # prints local URL + Anon Key
# Inbucket UI: http://localhost:54324  (click confirmation links here)
# Studio UI:   http://localhost:54323  (inspect auth.users, run SQL)
```

Keep two env files:

- `.env.local` — points at local Supabase (default for `npm run dev`).
- `.env.production.local` — points at prod Supabase, only swapped in for
  Phase 2 smoke tests.

### Phase 1 — Local Supabase, full matrix (90% of testing)

Run every case in §3 below against local. Click confirmation links in Inbucket.
Reset between users via DevTools → Application → Clear site data, or wipe
recent test users in Studio:

```sql
delete from auth.users where created_at > now() - interval '1 hour';
```

### Phase 2 — Prod Supabase smoke test (~5 emails total)

Once Phase 1 is clean, switch envs and verify only the prod-config-dependent
pieces. Cap at 5 emails so you stay under the throttle:

1. One upgrade → confirms Site URL is set correctly (email points at
   `pantry-run.vercel.app`, not `localhost`).
2. Click confirmation link → confirms `/auth/callback` exchange works.
3. One sign-in on a 2nd browser → confirms cookies/session work on prod.
4. One password reset → confirms recovery email template + `redirectTo` chain.
5. Sign in with the new password → confirms it persisted.

### Phase 3 — Dogfood with another household member

Hand off to one real user for a week. Real-world use surfaces edge cases
(PWA install + sign-in, multi-device session collision) that solo testing
can't catch.

### Tactics for solo multi-user testing

- **Email aliases**: `you+a@gmail.com`, `you+b@gmail.com`, etc. all land in
  the same inbox. Unlimited "different" emails from one mailbox.
- **Browser profiles** instead of separate browsers: Chrome Profiles or
  Firefox Containers give 5+ isolated cookie jars in one app.
- **Incognito = fast reset**: open/close incognito = fresh anon session,
  faster than clearing cookies.
- **Skip auth for non-auth tests**: navigation, banners, dismissal cadence,
  sheet focus, password-eye toggle — none of these touch Supabase. Knock
  them out first.

### Escape hatch if you must test on prod without burning emails

Supabase Dashboard → Authentication → Email Auth → **"Confirm email"** toggle.
Turn OFF → `updateUser({ email })` sets the email immediately without sending.
**Flip back on before real users hit it** — otherwise anyone can claim any
email without proving ownership.

---

## 2. Setup checklist (one-time)

- [ ] `npx supabase start` runs cleanly; `npx supabase status` prints URLs.
- [ ] `.env.local` points at the local stack (Anon Key + URL from
      `supabase status`).
- [ ] `npm run dev` loads `http://localhost:3000` without console errors.
- [ ] Inbucket at `http://localhost:54324` is reachable.
- [ ] Local Studio at `http://localhost:54323` shows the `auth.users` table.
- [ ] At least 2 browser profiles ready (anon-user A, anon-user B).

---

## 3. Test matrix

Each row is one scenario. Expected behaviour in parens. Tick when verified.

### A. Existing pre-V1.1 anonymous user (cookies survived deploy)

> Simulate by signing in with an old anon cookie OR by `update auth.users
set created_at = now() - interval '10 days' where id = '<your anon uid>';`
> in Studio, then refreshing.

- [ ] A.1 — Load `/` with valid pre-V1.1 cookie + household → bounces to `/list`.
- [ ] A.2 — Settings → "Account" card shows "Save your account" CTA.
- [ ] A.3 — With `created_at > 7 days` → SaveAccountBanner appears on `/list`.
- [ ] A.4 — Dismiss banner → gone. Refresh → still gone. Bump dismissed
      timestamp 14+ days into the past (localStorage key
      `pantry-run:save-account-dismissed-at`) → banner returns.
- [ ] A.5 — Save account with NEW email + password ≥ 8 chars → toast "Check
      your inbox at X to finish saving your account". SaveAccountBanner
      unmounts immediately. AccountSection swaps to "Pending confirmation"
      state showing the entered email + a "Resend confirmation email" button.
      Mailpit shows a confirmation email pointing at
      `127.0.0.1:3000/auth/callback`.
- [ ] A.5a — Click the confirmation link in Mailpit → `/auth/callback`
      exchanges → bounces to `/list`. Return to Settings → AccountSection now
      shows the fully upgraded state (email + Email + Sign out).
- [ ] A.5b — In pending state, click "Resend confirmation email" → second
      email appears in Mailpit, toast confirms "Sent another confirmation
      to X." (Useful when the original email got lost.)
- [ ] A.6 — Save account with email already used by another account → error
      "This email is already registered." + "Sign in instead →" link.
      Clicking the link closes the sheet and routes to `/sign-in`.
- [ ] A.7 — Save account with password < 8 chars → "Use at least 8 characters."
      (Client-side gate before network.)
- [ ] A.8 — Save account while offline (DevTools → Network → Offline) →
      "Connect to the internet to save your account." (D3 gate.)
- [ ] A.9 — Open Save sheet, type in email field → focus stays. Type in
      password → focus stays. (Sheet focus fix.)
- [ ] A.10 — Open Save sheet, click eye icon on password → text visible. Click
      again → masked.

### B. Brand new visitor (no session, no cookies)

> Use an incognito window or a fresh browser profile.

- [ ] B.11 — Load `/` → routes to `/welcome`. Check Studio `auth.users` — no
      new row created (D6: no auto-anon).
- [ ] B.12 — `/welcome` form: enter name, click "Create a household" → button
      text changes to "Connecting…" → lands on `/create`. Studio shows
      one new anon row.
- [ ] B.13 — `/welcome` → click "Sign in" link → `/sign-in`. Studio still
      shows no new auth row (sign-in path doesn't create one).
- [ ] B.14 — Direct nav to `/list` with no session → proxy bounces to `/welcome`.
- [ ] B.15 — `/sign-in` with valid creds → `/list`. With invalid creds →
      "Email or password is incorrect."

### C. Returning anon user (V1.1, never upgraded)

- [ ] C.16 — Load `/` with anon cookie + household → `/list`.
- [ ] C.17 — Anon user with no household (created session but bailed before
      creating) → `/welcome`. Re-running through Create reuses existing
      anon session (check Studio — same uid).
- [ ] C.18 — Save account flow → same as A.5.
- [ ] C.19 — Settings shows "Save your account" only. NO "Sign out" button
      (D5).

### D. Upgraded user (V1.1, has email)

- [ ] D.20 — Settings → AccountSection shows email + "Email" provider +
      "Sign out".
- [ ] D.21 — Click "Sign out" → stores wipe → `/welcome`. No auto-anon
      session minted (Studio: no new row).
- [ ] D.22 — After sign-out, click "Get started" on welcome → fresh anon
      session (Studio: new row), lands on `/create`. Old household
      unreachable.
- [ ] D.23 — After sign-out, click "Sign in" → enter old creds → back on
      `/list` with prior household intact.
- [ ] D.24 — Cross-device: sign in on browser B with same creds → identical
      `/list` state (household, members, items).
- [ ] D.25 — Try to sign in with an unconfirmed email + correct password →
      "Email or password is incorrect." (Generic copy — we don't leak
      unconfirmed state.)

### E. Password reset

- [ ] E.26 — `/sign-in` → "Forgot password?" → `/reset-password` → enter email
      → "If that email is on an account, a reset link is on its way."
      Same copy whether the email exists or not.
- [ ] E.27 — Click email link in Inbucket → `/auth/callback?code=...&next=
/reset-password/new` → exchange succeeds → land on
      `/reset-password/new`. **Critical:** this works even if the
      recovery user has a household. If they bounce to `/list`, the
      route-group placement broke.
- [ ] E.28 — Set new password (≥ 8, matches confirm) → `/list`. Sign in on
      browser B with new password → success.
- [ ] E.29 — Click reset link a second time (code already used) → bounces to
      `/sign-in?error=callback_failed` with "Sign-in link didn't work."

### F. Email-already-registered upgrade variants

> Verifies the error translation. Single `updateUser({ email, password })`
> call is used because Supabase's anon-upgrade path requires both fields
> atomically when email confirmation is enabled.

- [ ] F.30 — Anon user A upgrades with email X → success. Anon user B
      (different browser) upgrades with email X + different password →
      "This email is already registered." + "Sign in instead →" link.
- [ ] F.31 — Same as F.30 but identical password → "Pick a different password.
      If this is your existing account, sign in instead." + sign-in
      link. (The "trap" state: Supabase silently applied the password
      on attempt 1 even though email was rejected; the same password
      on attempt 2 collides with the silently-set one.)
- [ ] F.32 — From the F.31 trap state, retry with ANY different password
      (and any new email) → success. Escape is just "pick a different
      password" — surfaced by the error message.
- [ ] F.33 — Click the confirmation link from the original successful upgrade
      in Mailpit → lands on `/auth/callback` → exchange → redirects to
      `/list`. Studio shows `email_confirmed_at` set on the user and
      `is_anonymous = false`.
- [ ] F.34 — Anon user in pending-confirmation state navigates around the
      app (list, household, settings) — no errors, list works as before.
      SaveAccountBanner stays hidden (no double-nag).

### G. Cross-route navigation / edge cases

- [ ] G.34 — Anon user with no household navigates to `/sign-in` → renders
      form (no bounce; `(auth)` layout only bounces if they HAVE a
      household).
- [ ] G.35 — Upgraded user with household navigates to `/sign-in` →
      `(auth)` layout bounces to `/list`.
- [ ] G.36 — Upgraded user with household navigates to `/welcome` → same
      bounce.
- [ ] G.37 — Direct nav to `/auth/callback` with no `?code=` → bounces to
      `/sign-in?error=callback_missing_code`.
- [ ] G.38 — Direct nav to `/auth/callback?code=garbage` → exchange fails,
      bounces to `/sign-in?error=callback_failed`.
- [ ] G.39 — `?next=` param sanitization: visit `/auth/callback?code=<valid>
&next=https://evil.example` → redirect lands on `/list`, not
      evil.example. (Same-origin gate.)
- [ ] G.40 — PWA install (Add to Home Screen) → open the installed app →
      routing still correct; auth cookies survive standalone mode.

### H. Realtime / household interactions

- [ ] H.41 — While anon user is on `/list`, another household member checks
      an item → shows up in real time. (Pre-V1.1 behaviour unchanged.)
- [ ] H.42 — While Save sheet is open, realtime updates to the list don't
      tear down the sheet (focus stays where you left it, sheet
      remains mounted).
- [ ] H.43 — User upgrades email mid-session → `useSession` reflects new
      `email`/`provider` via `onAuthStateChange` → AccountSection swaps
      without a router refresh.

---

## 4. Known limitations / out-of-scope for M9

- Google Sign-In was descoped to V2. Skip any test that involves
  `signInWithOAuth` or `linkIdentity`.
- Offline upgrades are gated, not queued (D3). F.8 tests the gate; there's
  no queue to test.
- Sign-out is hidden for anon users (D5). There's no recovery path for a
  signed-out anon — if it ever surfaces in the UI, it's a bug.
- `/reset-password/new` is the only auth route deliberately outside the
  `(auth)` group. Don't move it back without re-verifying E.27.

---

## 5. After all boxes are ticked

- [ ] Run `npm run type-check && npm run lint && npm run format && npm run build`
      one last time.
- [ ] Note any flaky cases in `scratchpad.md` for the next milestone start.
- [ ] If anything failed, fix + retest only the affected rows. Don't re-run
      the whole matrix.

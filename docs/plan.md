# 🛒 Household Planner App — Product & Engineering Plan

---

## 1. Problem Statement

One person in a household maintains the shopping list. Everyone else either has to ask, or search through that person's notes. There is no shared source of truth, no real-time updates, and no easy way to collaborate. The goal is to solve this friction with a purpose-built, collaborative household planner starting from the grocery list use-case and expanding incrementally.

---

## 2. Target Users

| Segment    | Description                                              |
| ---------- | -------------------------------------------------------- |
| Couples    | Primary target. One person shops, both need to add items |
| Roommates  | 2–4 people splitting household responsibilities          |
| Families   | Parents and older children managing a shared home        |
| Caretakers | Adults managing grocery/errands for elderly parents      |

---

## 3. User Journey (V1)

### 3.1 First-Time User (List Creator)

```
Opens app
  → Prompted to create a household ("Create your household")
  → Enters household name (e.g., "Smith Family")
  → Gets a 6-digit invite code (e.g., HH-4829)
  → Lands on the shopping list (empty state)
  → Adds first items
  → Shares invite code with partner via SMS/WhatsApp
```

### 3.2 Partner Joining

```
Opens app
  → Taps "Join a household"
  → Enters 6-digit invite code
  → Joins immediately — sees the same list in real time
  → Can add, check off, or delete items
```

### 3.3 Active Shopping Session

```
User opens app at the grocery store
  → List sorted by category (Produce, Dairy, Meat, etc.)
  → Taps item to check it off — it moves to "In Cart" section
  → Partner at home adds "oat milk" — it appears instantly on the shopper's screen
  → All items checked → "Done shopping?" prompt → clears checked items
```

### 3.4 Returning User (No Friction)

```
Opens app
  → Straight to list — no login required (guest session persists)
  → Previous items still there
  → Can begin adding immediately
```

---

## 4. Features

### 4.1 V1 — Core (Must Ship)

| Feature                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| Create / join household | Via 6-digit invite code, no email required                   |
| Shared shopping list    | Real-time sync across all household members                  |
| Add items               | Free-text input, fast — one tap to add                       |
| Check off items         | Tap to mark done, visually separated from remaining          |
| Delete items            | Swipe or long-press to remove                                |
| Auto-category sorting   | Detect category from item name (Banana → Produce)            |
| Offline support         | View and edit list without internet; sync on reconnect       |
| Multiple lists          | E.g., separate lists for different stores                    |
| Activity indicator      | Show when someone else is editing ("Sarah is adding items…") |

### 4.2 V2 — Enhancing Utility

| Feature            | Description                                      |
| ------------------ | ------------------------------------------------ |
| Recurring items    | Staples auto-appear weekly (eggs, bread, milk)   |
| Smart suggestions  | "You usually buy X — add it?" based on history   |
| Quantity & unit    | "2 lbs chicken breast" instead of just "chicken" |
| Notes per item     | "Get the organic one"                            |
| Push notifications | "John added 5 items to the list"                 |
| Archive / history  | See what was on the list last week               |

### 4.3 V3 — Household Planner Expansion

| Feature                | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| Meal planner           | Plan meals for the week → auto-generates grocery list |
| Chores & tasks         | Assign household tasks with due dates                 |
| Shared budget tracker  | Log spend per shopping trip                           |
| Pantry tracker         | What you already have at home                         |
| Multiple households    | For people managing more than one home                |
| Store price comparison | Track price of items across stores over time          |

---

## 5. Sync Strategy — How Others Solve This

This is the most critical engineering decision. There are four main approaches:

---

### 5.1 Option A: Firebase Firestore (Managed Real-Time Sync)

**How it works:** Data lives in Firestore (a document-NoSQL database). The client SDK opens a WebSocket-like connection and listens to document changes. Any write by any client immediately propagates to all other clients listening to the same document.

**Pros:**

- Real-time sync works out of the box with ~5 lines of code
- Mature offline-first support — the SDK caches locally and queues writes; when offline writes happen, they merge on reconnect automatically
- Battle-tested at scale (used by millions of apps)
- Firebase handles conflict resolution via last-write-wins with server timestamps
- Built-in auth, push notifications (FCM), and hosting in one ecosystem

**Cons:**

- Vendor lock-in to Google; migrating away is painful
- NoSQL data model makes complex queries (joins, aggregations) awkward
- Pricing can spike unpredictably at scale (per read/write/delete operation)
- Limited querying — no SQL, no full-text search natively
- Schema enforcement is entirely on the developer

**Best for:** Fast MVP, teams without backend engineers, apps that need offline-first on mobile.

---

### 5.2 Option B: Supabase (Postgres + Real-Time via WebSockets)

**How it works:** A PostgreSQL database with a real-time layer on top. Supabase uses Postgres logical replication to broadcast row-level changes to subscribed clients over WebSockets. You write SQL, define Row Level Security (RLS) policies, and subscribe to table changes.

**Pros:**

- Full SQL power — complex queries, joins, foreign keys, transactions
- Open source — self-hostable, no vendor lock-in
- Predictable, tiered pricing
- Row Level Security means the database enforces access rules (e.g., "users can only see lists in their household")
- Scales naturally as the app grows to full SaaS
- Auth, storage, and edge functions included

**Cons:**

- More setup than Firebase (you define schema, migrations, RLS policies)
- Offline support is not as mature as Firebase; requires manual handling with local-first libraries
- Real-time subscription model requires careful design to avoid unnecessary data broadcasting

**Best for:** Teams comfortable with SQL, apps with structured relational data, projects where avoiding lock-in matters.

---

### 5.3 Option C: CRDTs (Conflict-Free Replicated Data Types) with Yjs or Automerge

**How it works:** Rather than relying on a central server to mediate conflicts, CRDT data structures are mathematically designed to always merge without conflicts. Each client maintains its own copy of the data. Operations are encoded as CRDT updates that can be applied in any order and still converge to the same result. Figma and Notion use this approach.

**Pros:**

- True offline-first — works entirely without a server; sync happens peer-to-peer or via a relay when online
- No conflict resolution needed — the algorithm guarantees convergence
- Extremely resilient to network interruptions
- Ideal for scenarios where two people edit the same item simultaneously

**Cons:**

- Significantly more complex to implement and debug
- Metadata overhead — CRDTs store operation history, which grows over time
- Overkill for a shopping list — true simultaneous conflicts are extremely rare in this use-case
- Harder to build audit trail features ("who added this item?") without extra work

**Best for:** Rich text editors, collaborative design tools, applications where true peer-to-peer sync is needed.

---

### 5.4 Option D: Custom WebSocket Server (Roll Your Own)

**How it works:** You run a Node.js/Go server with WebSocket support. Clients connect, send events (ADD_ITEM, CHECK_ITEM, DELETE_ITEM), and the server broadcasts to all other clients in the same household room. Postgres is the source of truth.

**Pros:**

- Full control over every aspect of the sync logic
- No vendor dependency
- Cheapest at scale (no per-operation pricing)

**Cons:**

- You own all infrastructure — scaling, uptime, WebSocket connection management
- Offline sync must be hand-rolled
- Much more engineering time to ship a V1

**Best for:** Teams with strong backend expertise who need precise control and are building for scale from day one.

---

### 5.5 Recommendation for This App

**Use Supabase for V1 and V2.**

A shopping list is inherently structured and relational. Households have members. Lists belong to households. Items belong to lists. This maps perfectly to SQL tables. Supabase's real-time subscriptions are more than sufficient for a list that changes a few dozen times a day.

Most importantly, Supabase avoids the vendor lock-in trap. As the app grows toward meal planning, budgeting, and multi-household support, SQL will pay dividends that Firestore cannot match. Starting with a solid relational schema now prevents a painful migration later.

Firebase is the right call only if the goal is to ship a demo in 48 hours. For a product you intend to grow, Supabase is the better foundation.

---

## 6. Auth Strategy — Login vs. Guest Mode

### 6.1 The Tradeoff

| Concern                 | Guest Mode                       | Auth Required                   |
| ----------------------- | -------------------------------- | ------------------------------- |
| Friction to try the app | Near zero                        | High (form, email confirm)      |
| Data persistence        | Tied to device                   | Follows the user across devices |
| Sharing lists           | Via invite code only             | Invite code + email             |
| Security                | Weak (anyone with code can join) | Invite code + account required  |
| Recovery if phone lost  | Data lost                        | Data restored on new device     |

### 6.2 Recommendation: Soft Auth — Guest First, Auth Later

**V1 Strategy:**

- User opens the app and is immediately given a guest session (anonymous ID stored locally)
- They can create or join a household immediately with no sign-up
- After they have invested in the app (added items, used it a few times), prompt them to "save your account" with email/password or Google Sign-In
- This converts their guest session to a full account without losing any data

This is the pattern used by apps like Notion, Figma (before workspaces), and Todoist. It removes the sign-up barrier but still captures accounts when users see value.

**V1 Auth Tech:** Supabase anonymous auth → upgrade to email/Google. One SDK, two flows.

**V2 and beyond:** Once accounts exist, add household permissions (owner vs. member), the ability to remove members, and account recovery.

---

## 7. Tech Stack

### 7.1 Frontend — V1 (PWA)

| Layer            | Choice                       | Reason                                                                                                      |
| ---------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Framework        | **Next.js (React)**          | PWA-first. App Router for file-based routing, server components where useful, easy Vercel deployment.       |
| Styling          | **Tailwind CSS**             | Same utility-first philosophy as NativeWind; easy to carry conventions to React Native later.               |
| State Management | **Zustand**                  | Lightweight, simple, works great alongside real-time subscriptions.                                         |
| Local Storage    | **localStorage + IndexedDB** | Offline queue and list cache in the browser. IndexedDB for structured data, localStorage for session state. |
| PWA              | **next-pwa**                 | Service worker generation, asset caching, offline fallback, "Add to Home Screen" manifest.                  |

### 7.2 Frontend — Future Native App (when monetising)

When subscriptions and in-app purchases are needed, the codebase migrates to React Native. The transition is low-friction because both share the same React paradigms, Tailwind/NativeWind utility classes, and the identical Supabase backend.

| Layer         | Choice                  | Notes                                             |
| ------------- | ----------------------- | ------------------------------------------------- |
| Framework     | **React Native (Expo)** | Replaces Next.js for mobile                       |
| Styling       | **NativeWind**          | Direct carry-over from Tailwind CSS conventions   |
| Navigation    | **Expo Router**         | File-based routing mirrors Next.js App Router     |
| Local Storage | **MMKV**                | Replaces IndexedDB; 10x faster than AsyncStorage  |
| Subscriptions | **RevenueCat**          | Free up to $2,500/month tracked revenue, then 1%  |
| Ads           | **Google AdMob**        | Free-tier users only; paid subscribers see no ads |

### 7.3 Backend (unchanged across V1 and native)

| Layer              | Choice                                     | Reason                                                                      |
| ------------------ | ------------------------------------------ | --------------------------------------------------------------------------- |
| BaaS / Database    | **Supabase**                               | PostgreSQL + real-time + auth + row-level security in one platform          |
| Real-time          | **Supabase Realtime (WebSockets)**         | Subscribe to table-level changes. Sufficient for list sync.                 |
| Auth               | **Supabase Auth**                          | Anonymous → email/Google upgrade flow. JWT-based.                           |
| Push Notifications | **Supabase Edge Functions + Web Push API** | V1.1 feature. Web Push works in PWA on Android; limited on iOS until 16.4+. |
| File Storage       | **Supabase Storage**                       | For future features (receipts, product photos)                              |

### 7.4 Infrastructure & DevOps

| Layer              | Choice             | Reason                                                               |
| ------------------ | ------------------ | -------------------------------------------------------------------- |
| Hosting (Frontend) | **Vercel**         | Free hobby tier. Deploys on every git push. Global CDN.              |
| Hosting (Backend)  | **Supabase Cloud** | Managed. Free tier is generous for early users.                      |
| CI/CD              | **GitHub Actions** | Run tests and lint on pull requests; auto-deploy to Vercel on merge. |
| Monitoring         | **Sentry**         | Error tracking and performance for both PWA and future native app.   |
| Analytics          | **PostHog**        | Open source. Track feature adoption without giving data to Google.   |

---

## 8. Data Model (Supabase / PostgreSQL)

```sql
-- Core tables

households
  id          uuid PRIMARY KEY
  name        text
  invite_code text UNIQUE   -- 6-character alphanumeric
  created_at  timestamp

household_members
  id            uuid PRIMARY KEY
  household_id  uuid REFERENCES households
  user_id       uuid REFERENCES auth.users
  role          text   -- 'owner' | 'member'
  joined_at     timestamp

lists
  id            uuid PRIMARY KEY
  household_id  uuid REFERENCES households
  name          text   -- "Costco Run", "Weekly Groceries"
  created_at    timestamp

list_items
  id            uuid PRIMARY KEY
  list_id       uuid REFERENCES lists
  added_by      uuid REFERENCES auth.users
  name          text
  quantity      text   -- "2 lbs", "1 dozen"
  category      text   -- "Produce", "Dairy", "Meat", "Pantry"
  is_checked    boolean DEFAULT false
  checked_by    uuid REFERENCES auth.users
  checked_at    timestamp
  note          text
  sort_order    integer
  created_at    timestamp
  updated_at    timestamp
```

**Row Level Security rules ensure:**

- A user can only see `list_items` that belong to lists in households they are a member of
- A user can only modify items in their household's lists
- The invite code is the only way to join a household; no user can add themselves arbitrarily

---

## 9. Offline Strategy

Real-time apps break when the network drops. Here is how to handle it:

**Write path (offline):**

- User adds/checks items → writes immediately to local state (Zustand store) + IndexedDB queue
- UI reflects the change instantly (optimistic update)
- Background sync process (service worker) drains the queue when network is available

**Read path (offline):**

- Last known list state is cached in IndexedDB by the service worker
- User can view and modify the list; all changes are queued locally
- A subtle "Offline — changes will sync" banner shown when disconnected

**Conflict resolution:**

- For checked/unchecked: last-write-wins with server timestamp (simple, sufficient)
- For item names: last-write-wins (two people editing the same item name simultaneously is rare)
- For item additions: additive — both items appear (no conflict)

---

## 10. V1 Scope — What We Ship First

The V1 is a PWA, ruthlessly scoped. Ship fast, validate with real users.

### In scope for V1:

- Next.js app deployed on Vercel, installable as a PWA
- Create household with invite code
- Join household with invite code
- Guest session (no sign-up required to start)
- Single shared shopping list per household
- Add, check off, delete items
- Real-time sync (changes appear on partner's screen within ~1 second)
- Auto-categorize items (keyword matching to start)
- Basic offline support (service worker cache + optimistic updates + sync on reconnect)
- Works on iOS (Safari) and Android (Chrome) via browser

### Out of scope for V1:

- Multiple lists per household
- Push notifications
- Recurring items
- Account login / password recovery
- Meal planning
- Native mobile app (iOS/Android)
- Quantity / notes per item

### PWA-specific considerations:

- **iOS install:** "Add to Home Screen" only works via Safari on iPhone — Chrome on iOS does not support PWA installation. Onboarding should include a nudge: _"For the best experience, open in Safari and tap Share → Add to Home Screen."_
- **iOS push notifications:** Only supported on iOS 16.4+ and only when installed as a PWA (not via Safari browser tab). Scoped out of V1.
- **Offline on iOS:** Safari's service worker storage is capped and can be cleared by the OS under storage pressure. List cache is kept minimal to avoid this.
- **Android:** Full PWA support including install prompt and push notifications. Better experience than iOS.

**Target timeline for V1:** 4–6 weeks solo developer. 2–3 weeks for a two-person team.

---

## 11. V1 Milestone Breakdown

V1 is split into 8 milestones. Each one is independently deployable and testable — at no point is there a long stretch of work that can't be demonstrated. They must be completed in order, as each builds directly on the previous.

---

### M0 — Scaffold & Infrastructure

**~2–3 days**

The foundation everything else builds on. Nothing user-facing ships here, but without this done properly every subsequent milestone is slower.

**Deliverables:**

- Next.js project initialised with App Router
- Tailwind CSS configured with design tokens (colours, fonts, spacing) from the design document
- Plus Jakarta Sans + DM Sans loaded via `next/font`
- Supabase project created; environment variables wired up
- Supabase client utility (`/lib/supabase.ts`) set up for both client and server components
- Database schema created and migrated (all four tables: `households`, `household_members`, `lists`, `list_items`)
- Row Level Security policies written and tested in Supabase dashboard
- Vercel project connected to GitHub repo; auto-deploy on push to `main`
- ESLint + Prettier configured
- Basic folder structure established (`/app`, `/components`, `/lib`, `/hooks`, `/store`)

**Done when:** Pushing to `main` deploys a blank Next.js page to Vercel, and a test Supabase query returns successfully from the deployed app.

---

### M1 — Guest Auth & Session Persistence

**~2–3 days**

Users need an identity before they can own a household or a list. This milestone establishes anonymous sessions that survive page refreshes and app re-opens — silently, with no sign-up form.

**Deliverables:**

- Supabase anonymous auth enabled and integrated
- On first app open: anonymous session created automatically, stored in localStorage
- On subsequent opens: session restored from storage; no new session created
- Zustand store set up with `user` slice (userId, isAnonymous, displayName)
- `displayName` prompted lightly during onboarding (first name only, optional)
- Auth middleware in Next.js: unauthenticated routes redirect to onboarding
- `useSession` hook that exposes current user state throughout the app

**Done when:** Opening the app in a fresh browser creates an anonymous session. Refreshing the page retains the same session. Opening in a second tab shares the session.

---

### M2 — Household Create & Join

**~3–4 days**

The first user-facing feature and the entire collaboration model. Until two people can join the same household, the app has zero value.

**Deliverables:**

- Onboarding screens built and styled: Welcome → Create or Join
- **Create flow:** Enter household name → household row created in DB → 6-char invite code generated and displayed → "Share" triggers Web Share API → "Go to my list" navigates to list
- **Join flow:** Enter invite code (auto-uppercase, auto-format `HH-XXXX`) → validates against DB → joins household → navigates to list
- Invite code expiry: codes expire 24 hours after generation (DB trigger or Edge Function)
- Error states: code not found, code expired, already a member
- `household_members` row created on create/join
- `useHousehold` hook returns current household and members
- Returning user (session + household exists): skips onboarding entirely, goes straight to list

**Done when:** Two separate browser sessions can create and join the same household using an invite code. Both sessions display the same household name.

---

### M3 — Shopping List Core (CRUD)

**~4–5 days**

The heart of the app. No real-time sync yet — just a working list that persists to the database. This milestone builds the complete UI users will interact with daily.

**Deliverables:**

- List screen layout: header, scrollable list body, pinned add bar, bottom navigation shell
- Load and display list items from Supabase for the current household's list
- **Add item:** Type in add bar → Enter or [+] → item appears immediately (optimistic) → written to DB → input clears → keyboard stays open for next item
- **Check off item:** Tap checkbox → animates to checked → moves to "Checked" group at bottom after 800ms → DB updated
- **Delete item:** Swipe left → delete zone revealed → confirm swipe → item collapses out → DB row deleted → undo toast for 4 seconds
- **Checked items section:** Collapsed by default with item count shown. "Clear checked" with confirm prompt.
- **Auto-category detection:** Client-side keyword dictionary (~150 common items). Items sorted into category sections. Unknown items go to "Other".
- Category section headers: label + item count, collapsible
- Empty state illustration and copy
- "Done shopping?" prompt when all items are checked
- Edit item bottom sheet: name, quantity, category override, note, delete

**Done when:** One person can fully manage a grocery list — add, check off, edit, delete items — and the data survives a page refresh.

---

### M4 — Real-Time Sync

**~3–4 days**

The feature that makes the app genuinely collaborative. When one person adds "oat milk" from the couch, it appears on the shopper's phone within a second.

**Deliverables:**

- Supabase Realtime subscription on `list_items`, scoped to the current household's list
- Subscribe to `INSERT`, `UPDATE`, and `DELETE` events
- Incoming `INSERT`: item slides into the correct category section with a left-border flash
- Incoming `UPDATE` (check/uncheck, edit): item state updates in place, no full re-render
- Incoming `DELETE`: item collapses out silently
- Collaborator presence indicator in header: "● Sarah is here" via Supabase Realtime Presence channel
- Sync status indicator: brief spinner while a write is in-flight; checkmark flash on success
- Reconnection handling: client auto-reconnects; re-fetches list state on reconnect to catch missed events

**Done when:** Two browser tabs open the same household list. Adding an item on one appears on the other within 1–2 seconds without any page refresh.

---

### M5 — Offline Support

**~3 days**

A grocery app that breaks in a supermarket with poor signal is a failed grocery app.

**Deliverables:**

- `next-pwa` installed and configured; service worker generated on build
- Service worker caches: app shell (HTML, CSS, JS bundles), fonts, icons
- Last-known list state cached in IndexedDB via `idb` library
- On app open with no network: cached list renders immediately
- Offline write queue: add/check/delete actions while offline saved to IndexedDB queue
- Background sync: when network returns, queue drains in order; writes execute sequentially
- Optimistic updates confirmed working offline (local state updates regardless of network)
- Offline banner: slides in below header on network loss; auto-dismisses 2s after reconnect
- Conflict resolution on reconnect: last-write-wins using Supabase server timestamp (`updated_at`)

**Done when:** Disable WiFi and mobile data. Open the app — list loads from cache. Add and check off items. Re-enable network. Both changes sync to the DB and appear on a second device.

---

### M6 — PWA Polish & Install

**~2–3 days**

Turns a working web app into something that feels native on both iOS and Android.

**Deliverables:**

- `manifest.json` complete: name, short name, icons (192, 512, 512 maskable), theme colour, background colour, display standalone, portrait orientation
- App icons exported at all required sizes
- iOS Safari install nudge: appears after 3rd session, Safari-only, not-yet-installed only, permanently dismissible
- Android Chrome install prompt: intercept `BeforeInstallPromptEvent`, show custom banner; "Install" triggers the browser prompt
- Keyboard handling: Visual Viewport API keeps add bar above keyboard on iOS and Android
- `overscroll-behavior-y: contain` prevents browser pull-to-refresh conflict
- `env(safe-area-inset-bottom)` on nav bar and add bar for iPhone home indicator
- `env(safe-area-inset-top)` on header for Dynamic Island / status bar
- Dark mode: `prefers-color-scheme` respected; manual override available in Settings
- Tested on real devices: iPhone (Safari) and Android (Chrome)

**Done when:** App installs to the home screen on both iOS and Android, opens without browser chrome, handles the keyboard correctly, and respects safe areas on iPhone.

---

### M7 — QA, Edge Cases & Launch

**~3–4 days**

The difference between "works on my machine" and something you'd confidently hand to another person.

**Deliverables:**

- Full happy-path test on real devices — both household members go through the entire flow from scratch
- Edge cases tested and resolved:
  - Two people add the same item simultaneously
  - Invite code entered incorrectly multiple times
  - Page closed mid-sync
  - List has 0 items (empty state)
  - Item name is very long (100+ characters)
  - Keyboard dismissed mid-animation
- React error boundaries added around list and household screens
- Sentry installed; unhandled errors verified in the Sentry dashboard
- Lighthouse audit: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90, PWA ✓
- Accessibility failures from audit fixed
- Cross-browser tested: Chrome (Android), Safari (iOS), Chrome (desktop), Safari (desktop), Firefox (desktop)
- Supabase free tier confirmed active; project not at risk of pausing
- Custom domain set up on Vercel (optional)

**Done when:** Both household members are using it for their actual weekly grocery shopping without issues.

---

### M0–M7 Summary

| Milestone | Focus                            | Est. Days | Cumulative Days |
| --------- | -------------------------------- | --------- | --------------- |
| M0        | Scaffold & infrastructure        | 2–3       | 3               |
| M1        | Guest auth & session persistence | 2–3       | 6               |
| M2        | Household create & join          | 3–4       | 10              |
| M3        | Shopping list core (CRUD)        | 4–5       | 15              |
| M4        | Real-time sync                   | 3–4       | 19              |
| M5        | Offline support                  | 3         | 22              |
| M6        | PWA polish & install             | 2–3       | 25              |
| M7        | QA, edge cases & launch          | 3–4       | 29              |

**Total: ~4–5 weeks** working evenings and weekends as a solo developer.

---

## 12. Incremental Upgrade Roadmap

```
V1 — PWA (Weeks 1–6)
  └── Next.js PWA on Vercel
  └── Core list, real-time sync, household invite, guest auth, offline
  └── Works in browser; installable via Safari (iOS) and Chrome (Android)

V1.1 — PWA (Weeks 7–12)
  └── Multiple lists per household
  └── Item quantity and notes
  └── Activity feed ("who added what, when")
  └── Full auth — email + Google Sign-In, account recovery
  └── Push notifications (Android PWA; iOS 16.4+ PWA only)

V2 — PWA + Begin Native Prep (Months 4–6)
  └── Recurring items / smart suggestions
  └── List history and archive
  └── Begin React Native port (Expo) — same Supabase backend, shared logic
  └── Internal TestFlight / EAS build for early testers

V3 — Native App + Monetisation (Months 7–12)
  └── Ship to App Store (Apple $99/yr) and Google Play ($25 one-time)
  └── RevenueCat integration for subscription management
  └── Free tier (ads via AdMob) + Pro tier (ad-free + premium features)
  └── Meal planner → auto-generates grocery list
  └── Household chores / task assignment

V4 — Household Platform (Year 2)
  └── Shopping budget tracking
  └── Pantry tracker
  └── Multiple households
  └── Store profiles (different layouts per store)
  └── Price tracking across stores
```

---

## 13. Cost & Monetization

### 13.1 Cost by Stage

| Stage                   | Users   | Monthly Cost   | Notes                                                       |
| ----------------------- | ------- | -------------- | ----------------------------------------------------------- |
| **Personal (V1)**       | 2       | $0             | Vercel free + Supabase free                                 |
| **Early public**        | ~100    | ~$8/month      | Apple $99/yr ÷ 12 only if going native; Supabase still free |
| **Growing PWA**         | ~1,000  | $0–$25/month   | Supabase free holds; upgrade to Pro ($25) for daily backups |
| **Native + Monetising** | ~5,000  | ~$33/month     | Apple $99/yr + Supabase Pro $25                             |
| **Scaling**             | ~20,000 | ~$60–100/month | Supabase Pro + possible compute add-on                      |

### 13.2 When to Upgrade Supabase

The free tier (500MB DB, 50K MAU, 200 realtime connections) is sufficient until roughly 40,000 monthly active users. The trigger to move to Pro ($25/month) is when you need daily backups and guaranteed uptime for a public product — not just hitting user limits.

**One gotcha:** Free projects are paused after 7 days of inactivity. For a household app used daily this is never an issue, but worth knowing before going public.

### 13.3 Monetization Model (when going public)

**Free tier:** 1 household, 1 shared list, up to 5 members, real-time sync, ad-supported

**Pro ($2.99/month per household):** Ad-free, unlimited lists, recurring items, meal planner, history archive, budget tracker, push notifications

**Family ($4.99/month):** Everything in Pro + up to 10 members + multiple households + pantry tracker

### 13.4 Revenue Share (Native App Stores)

Every subscription sold through the app stores incurs a platform cut before revenue reaches you:

| Platform          | Standard cut         | Small Business Program  |
| ----------------- | -------------------- | ----------------------- |
| Apple App Store   | 30%                  | 15% (if under $1M/year) |
| Google Play Store | 15% (first $1M/year) | Same                    |

On a $2.99/month Pro subscription, you net approximately $2.09–$2.54 per subscriber after the store cut. Subscriptions purchased through your website bypass this fee entirely — a meaningful optimisation at scale.

### 13.5 RevenueCat (Subscription Infrastructure)

RevenueCat handles the complexity of StoreKit (iOS) and Google Play Billing (Android) in a unified SDK. Pricing: free up to $2,500/month tracked revenue, then 1% above that. For a household utility app in early growth, RevenueCat costs nothing.

### 13.6 Google AdMob (Free-Tier Ads)

AdMob is free to integrate — it pays you per impression. Expected CPM in Australia: $0.50–$2.00. Ads are only shown to free-tier users; paying subscribers are ad-free. On iOS, Apple's App Tracking Transparency (ATT) prompt is required before personalised ads — expect 30–50% of users to decline, which roughly halves iOS ad revenue compared to Android.

### 13.7 Estimated Revenue at Scale

| MAU    | ~3% Conversion  | Gross Revenue | After Apple 15% | After RevenueCat 1% |
| ------ | --------------- | ------------- | --------------- | ------------------- |
| 1,000  | 30 subscribers  | ~$90/month    | ~$76            | ~$75                |
| 5,000  | 150 subscribers | ~$450/month   | ~$382           | ~$378               |
| 20,000 | 600 subscribers | ~$1,794/month | ~$1,525         | ~$1,510             |

---

## 14. Key Risks & Mitigations

| Risk                                                        | Likelihood | Impact | Mitigation                                                                                               |
| ----------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Users don't bother inviting — one person still uses it solo | High       | High   | Make the onboarding invite flow seamless (share via WhatsApp in 2 taps)                                  |
| Real-time sync lag frustrates users                         | Medium     | High   | Optimistic updates make it feel instant even if server is slow                                           |
| Invite code abuse (strangers joining household)             | Low        | Medium | Codes expire after 24 hours or 1 use; add "approve join request" in V1.1                                 |
| Supabase free tier limits hit early                         | Low        | Medium | Free tier supports 500MB DB and 50K MAU — plenty for early users; upgrade to Pro ($25/mo) when needed    |
| iOS users can't find the install prompt                     | Medium     | Medium | Onboarding screen with explicit Safari-specific instructions; "Add to Home Screen" nudge after first use |
| Safari clears PWA storage under iOS memory pressure         | Low        | Medium | Keep offline cache minimal; sync frequently; show clear "last synced" indicator                          |
| iOS push notifications don't work for some users            | Medium     | Low    | Scoped out of V1; document iOS 16.4+ requirement clearly when shipping V1.1                              |
| App store review rejection (when going native)              | Low        | Low    | Expo provides proven templates; follow Apple HIG from the start of the native port                       |

---

## 15. Summary Table

| Decision      | V1 Choice                                       | Future (Monetising)                                |
| ------------- | ----------------------------------------------- | -------------------------------------------------- |
| Delivery      | **PWA (Next.js + Vercel)**                      | **React Native (Expo)** via App Store              |
| Sync strategy | Supabase Realtime (WebSockets)                  | Unchanged                                          |
| Auth          | Guest-first → soft email/Google upgrade         | Unchanged                                          |
| Offline       | Service worker + IndexedDB + optimistic updates | MMKV + same optimistic pattern                     |
| Subscriptions | N/A                                             | RevenueCat (free until $2,500/month MTR)           |
| Ads           | N/A                                             | Google AdMob (free tier only; subscribers ad-free) |
| V1 cost       | **$0/year**                                     | ~$33/month (Apple $99/yr + Supabase Pro $25)       |
| V1 timeline   | 4–6 weeks solo                                  | —                                                  |

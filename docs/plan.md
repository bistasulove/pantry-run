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

| Layer              | Choice              | Reason                                                                                 |
| ------------------ | ------------------- | -------------------------------------------------------------------------------------- |
| Hosting (Frontend) | **Vercel**          | Free hobby tier. Deploys on every git push. Global CDN.                                |
| Hosting (Backend)  | **Supabase Cloud**  | Managed. Free tier is generous for early users.                                        |
| CI/CD              | **GitHub Actions**  | Run tests and lint on pull requests; auto-deploy to Vercel on merge.                   |
| Monitoring         | **Sentry** _(V1.1)_ | Error tracking and performance. Deferred to end of V1.1 to keep V1 surface area small. |
| Analytics          | **PostHog**         | Open source. Track feature adoption without giving data to Google.                     |

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
- Invite code expiry: codes expire 7 days after generation (bumped from 24h in M3.5 F4 after real-world testing — see §11 M3.5). Owners can regenerate on demand via the household screen.
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

### M3.5 — Testing & Feedback

**~1–2 days**

Post-M3 polish driven by real two-person testing. Not a feature milestone in the original 8-step plan — inserted retroactively to bundle the friction points surfaced by initial household testing before M4's realtime work begins.

**Deliverables:**

- **Display name is mandatory.** Welcome screen's Create/Join CTAs disabled until a name is entered. `/create` and `/join` redirect back to `/welcome` if the in-memory `userStore.displayName` is missing (covers refresh / direct hits). Settings page's Save is disabled when blank.
- **Missing-name banner.** App shell renders a one-tap "Set your name" CTA for any returning member whose `household_members.display_name` is null (covers anonymous joins from before the F1 enforcement landed).
- **"Added by X" attribution in the edit sheet.** `EditItemSheet` looks up the adder via `useHousehold().members + useSession().userId`. List rows stay clean — attribution only surfaces on tap.
- **Snapshot column + trigger so attribution survives a member leaving.** New `list_items.added_by_name text` column. `BEFORE DELETE` trigger on `household_members` snapshots the leaver's `display_name` onto every item they added in that household. After the row is gone, `EditItemSheet` renders "Added by Sarah (former member)".
- **Leave household — self.** Destructive section at the bottom of `/settings`. New `leave_household(p_new_owner_user_id uuid default null)` RPC handles four cases atomically: non-owner leaves, owner alone (cascade-deletes the household), owner with successor (atomic role-swap + leave), owner without successor (returns `needs_transfer` so the client opens the picker). Statuses: `left`, `transferred_and_left`, `needs_transfer`, `invalid_successor`, `not_a_member`, `unauthenticated`.
- **Remove member — owner.** Small × button next to each non-self member on `/household` (owners only). Two-step: × opens a confirm sheet → "Remove [Name]" destructive button. Client-side `.delete()` on `household_members`; RLS policy `household_members_delete_self_or_owner` already covers it.
- **Regenerate invite code + 7-day default (F4).** M2 set a 24-hour expiry and no regen path, which made every household more than a day old unjoinable. Fixed two ways: (a) bumped `create_household` default from 24h to 7 days, and (b) new `regenerate_invite_code(p_household_id)` SECURITY DEFINER RPC, owner-only, same alphabet + collision retry as `gen_invite_code`. The `/household` screen now branches on `isExpired × isOwner`: fresh code → existing display + a low-key "Rotate code" affordance for owners; expired + owner → prominent "Generate new code" button; expired + non-owner → "Ask [Owner Name] to generate a new code." Expiry is computed on the server and passed as a boolean prop to avoid hydration drift.

**Done when:** A two-person household can swap ownership and leave cleanly. The departing owner's items keep their attribution as "Added by X (former member)". Owners can revive an expired invite code without help.

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
| M3.5      | Testing & feedback               | 1–2       | 16              |
| M4        | Real-time sync                   | 3–4       | 20              |
| M5        | Offline support                  | 3         | 23              |
| M6        | PWA polish & install             | 2–3       | 26              |
| M7        | QA, edge cases & launch          | 3–4       | 30              |

**Total: ~4–5 weeks** working evenings and weekends as a solo developer.

> **Note on M3.5.** Not part of the original 8-step plan. Inserted retroactively after M3 to capture friction from real two-person testing — see the milestone's own deliverables above for the full list. Future milestones may grow similar `Mx.5` companions as feedback warrants.

---

## 11.5. V1.1 Milestone Breakdown

V1 shipped with ~10 active households. Feedback from those households reshaped the V1.1 scope: data-loss anxiety and "I retype milk every shopping trip" dominated the asks. The original V1.1 list (activity feed, push notifications) had zero user demand and was dropped — both deferred to V2.

V1.1 has seven milestones, themed **Continuity & Trust**. Each is independently deployable. They must be completed in order — M10 (Multiple Lists) lands before M11/M12 so the recurring + history features are built list-aware from day one.

---

### M8 — Item Quantity & Notes

**~2–3 days**

The smallest V1.1 feature — `list_items.quantity` and `list_items.note` columns already exist from M3. This milestone surfaces them with an optional, structured UI that supports common units without forcing every user to fill them in.

**Deliverables:**

- **Quantity:** structured `value + unit` UI in the edit sheet — numeric input + unit picker. Supported units: `g`, `kg`, `mL`, `L`, `piece`, `can`, `dozen`. The unit list is hard-coded for V1.1; no custom units.
- **Optional by design.** Items added via the quick-add bar have no quantity. Quantity only renders on the list row when set — otherwise the item name shows alone, identical to today. Keeps the list visually quiet by default.
- **Schema decision (locked at M8 kickoff):** either keep `quantity text` and store formatted strings (e.g. `"2 kg"`), or split into `quantity_value numeric` + `quantity_unit text`. Structured is more future-proof (sort, search, sum) but harder to migrate later — full tradeoff written at kickoff.
- **Notes:** existing `note text` field rendered as a secondary line on the list row when set, hidden when empty. Edit sheet gets a multi-line note input, soft-capped at 280 chars.
- **Migration:** existing data preserved. Items added before M8 with quantity baked into the name (e.g. `"milk x2"`) are not auto-parsed — users can re-edit if they want structured.

**Done when:** A household member can edit an item to add `2 kg` or `1 dozen` plus a note, both appear on the list row, and items without quantity look exactly as they do today.

---

### M9 — Full Account Upgrade (Email)

**~4–5 days**

Real-world feedback surfaced data-loss anxiety as the single largest concern from V1 users. This milestone converts anonymous sessions to permanent accounts without losing any data.

**Deliverables (as shipped):**

- **Sign-up methods:** email/password via Supabase Auth (`updateUser({ email, password })`). Google Sign-In was descoped to V2 — the Google Cloud Console + consent-screen setup added meaningful friction with no V1-user demand. The architecture stays Google-ready: `/auth/callback` already exchanges OAuth codes, and `useUpgradeAccount` is structured so `linkIdentity` can be re-added as a sibling method.
- **Upgrade flow:** anonymous user → "Save your account" CTA in Settings, plus an unobtrusive banner after 7 days of use (re-shows 14 days after dismissal). `supabase.auth.updateUser({ email, password })` preserves `auth.users.id`, so all `household_members.user_id` and `list_items.added_by` rows continue to resolve correctly — no data migration needed.
- **Sign-in flow:** new "Sign in" screen for users on a different device. Email/password only in V1.1. On success: household memberships hydrate via `useSession` → `useHousehold` chain.
- **Account recovery:** password reset email via `resetPasswordForEmail`. `/reset-password/new` lives outside the `(auth)` route group so the recovery session doesn't trip the "signed-in-with-household → /list" bounce before the user can set a new password.
- **Settings additions:** "Account" section showing email + provider; "Sign out" button. Anonymous users see only "Save your account" (no sign-out, since it would orphan their household irreversibly).
- **Behaviour change to anon-session creation:** `SessionProvider` no longer auto-mints an anon session on bootstrap. The "Get started" button on `/welcome` calls `signInAnonymously` explicitly. Without this, a real sign-out would silently mint a fresh ghost user on the next visit.
- **Proxy:** `src/proxy.ts` already protects `(app)` routes by session existence — no change needed. New sign-in route handlers under `src/app/(auth)/sign-in/`.
- **Edge case (descoped):** offline upgrade attempts are blocked with a friendly "Connect to the internet to save your account" message, not queued. Persisting the user's plaintext password in IndexedDB to replay later is a security regression we won't take.

**Required Supabase dashboard config** (not in code): Site URL + Additional Redirect URLs must include `{origin}/auth/callback` for prod + `http://localhost:3000/auth/callback` for dev. Email templates use `{{ .ConfirmationURL }}` by default.

**Done when:** A user with an anonymous session can convert to email/password, sign out, sign in on a different browser, and see their household and list intact.

---

### M10 — Multiple Lists per Household

**~4–5 days**

A subset of users wants a "staples" list separate from one-off shops, or per-store lists ("Costco Run" vs. "Weekly Groceries"). The `lists` table already supports this — every household just has exactly one row today. This milestone makes that count variable, and it lands before M11/M12 so recurring + history are built list-aware.

**Deliverables:**

- **List switcher** in the header — shows all lists for the household, indicates the active list.
- **Create / rename / delete list.** Any household member can create or rename; only the list creator or household owner can delete. Delete requires confirmation and cascades to `list_items`.
- **Per-list realtime:** `useList` gains a `listId` param; the realtime channel rescopes when active list changes (`supabase.removeChannel` + new `.channel('list:${listId}')`).
- **Per-list presence:** "● Sarah is on Costco Run" — presence channel rekeyed by `list_id`.
- **Default list per household.** New households get one list named "Shopping List" (preserves M2 behaviour). Active list per user persisted in `localStorage`.
- **Migration:** existing single-list households continue working seamlessly — the switcher just shows their one list.
- **Active list state:** lives in `householdStore` as `activeListId`; `listStore` reads from the active list only.

**Done when:** A household can have two separate lists. Adding to one doesn't affect the other. Realtime and presence rescope correctly when switching.

---

### M11 — Recurring / Staple Items + Shopping Trip Model

**~3–4 days**

The most-requested theme across all feedback: "I retype milk and eggs every shopping trip". This milestone introduces a `shopping_trip` data model and a `is_recurring` flag that together change the meaning of "Clear checked" from "destroy everything" to "complete this trip" — which also addresses the "what happens when I clear?" confusion.

**Deliverables:**

- **Schema:** `list_items.is_recurring boolean not null default false`. New `shopping_trips` table: `id`, `list_id`, `household_id`, `finished_by user_id`, `finished_at`, `item_count`. New `shopping_trip_items` table snapshots cleared items per trip (`trip_id`, `name`, `quantity_value`, `quantity_unit`, `category`, `note`, `was_recurring`, `added_by_name`).
- **"Mark as staple"** toggle on the edit sheet. Recurring items get a subtle indicator on the list row (small icon, no copy).
- **"Finish shopping" RPC.** Existing "Clear checked" button renamed to "Finish shopping". The server-side RPC, in one transaction:
  - Snapshots all currently-checked items into `shopping_trip_items`
  - Deletes non-recurring checked items
  - Unchecks recurring items (they stay on the list)
  - Creates one `shopping_trips` row
- **Confirmation preview** before Finish Shopping: "4 items will be removed, 3 staples will stay" — makes the behaviour explicit, addressing the V1 confusion.
- **Onboarding hint:** first time a user marks an item as staple, a one-line toast explains the behaviour.

**Done when:** Marking "milk" as recurring keeps it on the list (unchecked) after Finish Shopping. Non-recurring items disappear. A `shopping_trips` row records the trip.

---

### M12 — Shopping History

**~3–4 days**

The natural counterpart to M11. Once `shopping_trips` exist, users can revisit past trips and re-add items they forgot to mark as staples.

**Deliverables:**

- **History screen** at `/history`. Past trips for the household, grouped by month, showing date + finisher's display name + item count.
- **Trip detail sheet:** tap a trip → see all items, including quantity, note, and category.
- **Restore items:** "Add to current list" button on past-trip items. Bulk-select supported. Restored items are new rows with fresh `created_at` (not original timestamps).
- **History scope:** household-wide (across all lists). Each trip displays which list it was from. Per-list filter deferred to V2.
- **Cap:** show last 90 days by default; older trips reachable via "Load more". No deletion of trips in V1.1 — append-only.
- **Former-member handling:** trip items show "Added by Sarah (former member)" using the same M3.5 snapshot pattern.

**Done when:** A user can open History, see their last 5 trips, tap one, and restore "olive oil" to the current list.

---

### M13 — Sentry & Observability

**~1–2 days**

Deferred from M7 and reordered to the end of V1.1 at user request (reduces upfront tool-learning overhead). The smallest V1.1 milestone — wires what the M7 `ErrorFallback` was always designed to call.

**Deliverables:**

- `@sentry/nextjs` installed and configured.
- Replace `ErrorFallback`'s `console.error('[error-boundary]', error)` placeholder with `Sentry.captureException(error)`.
- Source-map upload via the Vercel + Sentry integration (no manual CI step).
- Add `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` to `.env.example` and CLAUDE.md §6. Flip CLAUDE.md §4 Monitoring row from "(deferred to end of V1.1)" → active.
- Test capture end-to-end: trigger a route boundary, confirm event lands in Sentry within seconds.
- PII handling: `sendDefaultPii: false`; only a hashed user ID sent for correlation. No item names, no household names.

**Done when:** A deliberate `throw` inside a route component lands a tagged event in the Sentry dashboard, with source-map-resolved stack frames.

---

### M14 — QA, Edge Cases & V1.1 Launch

**~2–3 days**

Mirrors M7 for V1.1 — real-device sweep, Lighthouse audit, cross-browser. Plus V1.1-specific edge cases that didn't exist in V1.

**Deliverables:**

- Full happy-path on real devices across the new flows: account upgrade → multi-list create → mark staples → finish shopping → review history → restore from history.
- V1.1-specific edge cases:
  - Offline account upgrade attempt — blocked with a friendly "Connect to the internet…" message (no plaintext password persisted; per M9 shipped behaviour, not queued — original "queued and replayed" deliverable amended at M14 kickoff to match what shipped)
  - Switching active list while offline — `activeListId` persists, realtime resubscribes on reconnect
  - Recurring-only list → "Finish shopping" should be disabled (nothing to remove)
  - History restore when the source list has been deleted — restore targets current active list
  - Concurrent Finish Shopping by two members on the same list — server RPC serialises per `list_id`
  - _(Google OAuth callback test cut at M14 kickoff — Google Sign-In was descoped to V2 in M9; no OAuth surface exists in V1.1)_
- Lighthouse audit: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90, PWA ✓.
- Cross-browser sweep: Chrome (Android), Safari (iOS), Chrome (desktop), Safari (desktop), Firefox (desktop).
- Sentry confirmed receiving events for both error-boundary triggers and unhandled rejections.
- V1.1 release note drafted and shared with the 10 active V1 households.

**Done when:** All 10 V1 households have been notified of V1.1, account upgrade flow tested by ≥ 2 households end-to-end, no P0/P1 bugs open.

---

### M8–M14 Summary

| Milestone | Focus                                 | Est. Days | Cumulative |
| --------- | ------------------------------------- | --------- | ---------- |
| M8        | Item Quantity & Notes                 | 2–3       | 3          |
| M9        | Full Account Upgrade (Email)          | 4–5       | 8          |
| M10       | Multiple Lists per Household          | 4–5       | 13         |
| M11       | Recurring / Staple Items + Trip Model | 3–4       | 17         |
| M12       | Shopping History                      | 3–4       | 21         |
| M13       | Sentry & Observability                | 1–2       | 23         |
| M14       | QA, Edge Cases & V1.1 Launch          | 2–3       | 26         |

**Total: ~3–4 weeks** working evenings and weekends as a solo developer.

> **Note on Sentry ordering.** Originally slotted as the first V1.1 milestone (to give observability to everything after it), Sentry was deferred to M13 at the user's request to reduce upfront tool-learning overhead. The tradeoff: M8–M12 ship without Sentry coverage. Acceptable because (a) the V1 userbase is ~10 households, (b) `ErrorFallback` already logs to console as a placeholder, and (c) M14 QA catches major issues before V1.1 reaches a broader audience.

> **Note on dropped V1.1 candidates.** Activity feed and push notifications were in the original V1.1 list (plan.md §12) but had zero user demand from V1 households — both moved to V2. Push notifications additionally hit the iOS 16.4+ installed-PWA-only constraint, which makes more sense to absorb during native port.

---

## 11.6. V2 Milestone Breakdown

V1.1 shipped 2026-05-24. The userbase has since grown to ~25 active households whose post-V1.1 feedback reshaped V2 substantially. The original V2 outline in §12 (push notifications, activity feed, smart suggestions, begin React Native port) survives in spirit but is reordered and reweighted; the native port slips to V3.

Five recurring pieces of feedback drove the reshape:

| #   | Signal                                                    | Strength                                                 | V2 fit              |
| --- | --------------------------------------------------------- | -------------------------------------------------------- | ------------------- |
| 1   | Household reminders (bin day, rent day, recurring)        | Strong — recurring across users                          | Headline (M17)      |
| 2   | Budget tracking                                           | Weak — 2 vague mentions                                  | Defer to V4 (§12)   |
| 3   | "Most items show as Other"                                | Strong — quality bug                                     | Fold in early (M15) |
| 4   | Cross-store price comparison                              | Weak — 1 user, very optimistic                           | Defer indefinitely  |
| 5   | Household todos / chores (mow lawn, plumbing, deep clean) | Strong — users already hacking a "Todos" list workaround | Headline (M18)      |

The three strong signals (1, 3, 5) all point in the same direction: users want Pantry Run to be a **household coordination** app, not just a shopping list. The "Todos" workaround (#5) is the loudest signal — users are already paying a usability cost to keep using the app for adjacent jobs. #2 and #4 are explicitly deferred (see the closing notes).

V2 has six milestones, themed **Household Coordination**. Each is independently deployable except M17 and M18, which require M16. M15 ships first because it's the lowest-risk, highest-satisfaction win and unblocks nothing else.

---

### 11.6.1 V2 UI & Navigation Strategy

V2 introduces three new feature surfaces (Reminders, Tasks, Activity). Naively mapping each to a BottomNav tab would push the tab count from 4 to 7 — a clutter regression the design philosophy ("Invisible Design" — `docs/design_document_guidelines.md` §1.1; reference apps Things 3, Linear, Notion) does not survive. This subsection locks the UI strategy before code starts so M17–M19 implement to a shared frame.

**BottomNav (4 tabs, unchanged count):**

| Tab     | Icon     | Content                                                        |
| ------- | -------- | -------------------------------------------------------------- |
| List    | Home     | Unchanged — shopping list, primary surface                     |
| Plan    | Calendar | M17 Reminders + M18 Tasks behind an internal segmented control |
| History | Clock    | Unchanged — M12 shopping history                               |
| More    | Avatar   | Sheet with Household, Settings, Notifications, Sign out        |

Activity (M19) is **not** a BottomNav tab. It becomes a Bell button in the Header with an unseen-count badge; tap opens an Activity sheet (overlay, not a full route). Rationale: activity is passive consumption — sheet pattern fits, and matches Slack / GitHub / Linear conventions where the notification surface lives in the Header, not the tab bar.

**Plan tab — unified UI, split data:**

The §11.6 M17 "Decisions to ratify" lean is **split** at the data layer (separate `reminders` and `tasks` tables, separate primitives). The UI gives them one home because the user's mental model is "things to do, scheduled or not." A segmented control inside `/plan` toggles between Reminders and Tasks views. Each view retains its full feature surface from M17 / M18 — only the BottomNav slot is unified.

**Header (new right side):**

- Household name + list switcher (left) — unchanged
- Bell button with unseen-activity badge (M19) — new
- Avatar chip — opens the More sheet (consolidates Household + Settings + Notifications + Sign out)

Both Bell and Avatar follow the 44px tap-target rule (CLAUDE.md §17). The bell badge is a small pill showing count (capped at "9+"), positioned top-right of the icon per the new design-system entry.

**`/list` page on-page hierarchy (single banner slot):**

At most **one** system banner is rendered at a time on `/list`. Priority order, highest first:

1. Offline indicator (sync state) — always wins when active
2. Missing-name banner (M3.5)
3. Install banner (M6)
4. Save-your-account banner (M9 — 7-day re-show)
5. Staple-hint toast (M11 — first staple-toggle only)

Smart suggestions chip row (M19) is **not** a banner — it lives above AddItemBar, below the list content, as a single text-line affordance (no chip backgrounds; `text-text-secondary` with inline action labels). Only rendered when signal is real (≥3 trips) and not dismissed. Collapses with the existing Visual Viewport keyboard handler.

**New design-system entries (`docs/design_document_guidelines.md` §7):**

Stub entries added now at V2 kickoff. Full visual specs filled in at the relevant Mx kickoff.

| Component           | Stub  | Owning milestone         | Used by  |
| ------------------- | ----- | ------------------------ | -------- |
| Segmented control   | §7.16 | M17 (Plan tab)           | M17, M18 |
| Filter chip         | §7.17 | M18 (Tasks filter)       | M18      |
| Header bell + badge | §7.18 | M19                      | M19      |
| Avatar menu chip    | §7.19 | M17 (BottomNav refactor) | All V2   |
| Suggestion chip row | §7.20 | M19                      | M19      |

**BottomNav migration:**

The 4-tab → 4-tab restructure lands as part of M17 (the first V2 milestone that adds a tab). Tab map change: Household and Settings move out of BottomNav into the Avatar menu sheet; Plan slot replaces Household position; Avatar slot replaces Settings position. No tab disappears entirely. Existing deep-links to `/household` and `/settings` continue to work — they're just reached via the Avatar menu now.

**What this does _not_ solve (accepted tradeoffs):**

- The Plan tab's segmented control adds one indirection vs. a hypothetical dedicated Reminders or Tasks tab. Acceptable: the segmented control is one tap, both views share the same `/plan` shell, and the trade buys us a clean tab count.
- The Activity sheet means users can't deep-link to a specific activity item from outside the app. Acceptable: activity items aren't durable references. Push notifications for reminders or tasks deep-link directly to `/reminders?focus=X` or `/tasks?focus=X`, not to the activity sheet.

---

### M15 — Smarter Categories

**~4–5 days**

The "most items show as Other" complaint is the loudest quality bug from V1.1. The current `src/lib/categories.ts` is a hand-curated keyword dictionary (~300 lines) that covers grocery basics but fails on long-tail items ("boba pearls", "haldi", "tahini"). This milestone makes detection smarter without breaking the offline-first model for cached items.

**Deliverables:**

- **Schema:** new `category_overrides` table — `normalised_name` (text, PRIMARY KEY — lowercased, whitespace-collapsed), `category` (text, must be in `CATEGORY_ORDER`), `source` (text: `'llm'` | `'keyword'`), `created_at`. Global cache shared across all households for cost amortisation. New `household_category_overrides` table — same shape plus `household_id` — for per-household user corrections (a household that rejects the LLM's call for "boba pearls" doesn't have to re-correct on every add).
- **RLS:** `category_overrides` is public-read; writes via Edge Function only. `household_category_overrides` is full-CRUD for household members.
- **New Edge Function `categorize_item`:** input `{ name }`, output `{ category, source }`. Algorithm: normalise → check household override → check global cache → call Claude Haiku with a constrained prompt that returns one of the 9 non-Other categories → write to global cache → return. Rate-limit by `household_id` (e.g. 100 calls/day) with graceful "Other" fallback on cap. Anthropic API key in `ANTHROPIC_API_KEY` (server-only).
- **Frontend integration:** `detectCategory(name)` becomes async. Algorithm: keyword match first (sync, offline) → if hit, return; → if miss and online, call Edge Function; → if miss and offline, return `'Other'` and tag the item with `category_pending=true` (new optional column on `list_items`) for opportunistic re-categorisation on reconnect.
- **User override UI:** category picker in the item edit sheet. User pick writes to `household_category_overrides` and updates the item. User picks always beat LLM picks.
- **Keyword dictionary expansion (opportunistic):** expand `CATEGORY_ORDER` to add **Snacks** and **Condiments & Sauces** — the two most common "Other" buckets observed in V1.1 trips. Decision to ratify at kickoff: expand further (Baby, Pet) or rely on the LLM for those long tails.
- **Cost guardrails:** Edge Function logs per-call cost to Sentry breadcrumbs; daily aggregate metric so we notice if a household triggers cache misses repeatedly.
- **Settings:** "About" section gains a one-line "Smarter categories" explainer noting cache-based behaviour and online requirement for unknown items.

**Decisions to ratify at kickoff:**

- Whether per-household overrides also feed back into the global cache (privacy: are item names PII? Lean: no, but worth an explicit ack).
- Whether the LLM-call seam is Anthropic SDK direct in the Edge Function vs. a thin wrapper for future provider portability.

**Done when:** Adding "boba pearls" to a list categorises it as Pantry (or another sensible category) within 1s when online. The next household to add "boba pearls" sees the category instantly via the global cache (no LLM call). Offline-added items fall back to "Other" with non-blocking re-categorisation on reconnect. A user can manually correct a category and the correction sticks household-wide.

---

### M16 — Push Notifications Infrastructure

**~3–4 days**

Unblocks M17 (reminders) and M18 (task assignment). Unsexy plumbing — VAPID keys, service worker push handler, subscription management, server-side send. No user-visible feature ships in this milestone alone except a Settings toggle and a dev-only test seam.

**Deliverables:**

- **VAPID key pair** generated locally and configured: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client) and `VAPID_PRIVATE_KEY` (server). Both added to `.env.example` and CLAUDE.md §6.
- **Schema:** new `push_subscriptions` table — `id`, `user_id` (REFERENCES auth.users ON DELETE CASCADE), `household_id` (denormalised for fan-out queries), `endpoint` (text), `p256dh` (text), `auth` (text), `user_agent_label` (text — e.g. "iPhone Safari"), `created_at`. UNIQUE(user_id, endpoint). RLS: user can SELECT/INSERT/DELETE their own rows only.
- **Service worker:** `public/sw.js` gains a `push` event handler that renders a notification from the payload (`{ title, body, kind, target_id, household_id }`), and a `notificationclick` handler that focuses the relevant route (`/reminders?focus=X`, `/tasks?focus=X`).
- **`usePushNotifications` hook:** detects support (`'serviceWorker' in navigator && 'PushManager' in window`), requests permission, calls `subscribe()`, POSTs subscription to `/api/push/subscribe`. Handles `pushsubscriptionchange` and re-subscribes transparently.
- **API routes:** `/api/push/subscribe` (POST, inserts row) and `/api/push/unsubscribe` (DELETE, removes row). Auth required.
- **Server-side helper `lib/push/send.ts`:** wraps the `web-push` library. Exposes `sendToUser(userId, payload)` and `sendToHousehold(householdId, payload)`. Reused by M17 reminder cron and M18 task-assignment flow.
- **Settings → Notifications section:** status (enabled / disabled / unsupported), enable/disable toggle, list of registered devices with a Remove button each. Unsupported-client fallback message lists the requirements (iOS 16.4+ installed PWA; Android Chrome / desktop Chrome / Firefox / Edge / Safari work natively).
- **Dev seam:** `/api/push/test` (gated by `NODE_ENV !== 'production'`) fires a sample notification to the current user. Removed at M20 close-out per the M13/M14 seam-and-remove pattern.

**Decisions to ratify at kickoff:**

- Whether to denormalise `household_id` onto `push_subscriptions` (lean: yes — saves a join per fan-out) or compute via `household_members` at send time.
- Whether expired-subscription cleanup (`web-push` returns 404/410) runs inline on the next send or via a separate sweep job.

**Done when:** A user with an installed PWA on a supported platform can enable notifications in Settings, see their device listed, and receive a test notification via the dev seam. Disabling removes the row server-side. iOS <16.4 / non-installed PWA shows the fallback message with no enable button.

---

### M17 — Household Reminders

**~5–6 days**

The largest V2 milestone — new primitive, new schema, new UI surface, server-side scheduling, push delivery, recurrence rules. Most-asked V2 feature ("every Thursday is bin day, every Monday is rent day").

**Deliverables:**

- **Schema:**
  - `reminders` — `id`, `household_id`, `title` (text, required), `notes` (text, optional), `recurrence` (text, subset of RRULE — see below), `next_fire_at` (timestamptz), `lead_minutes` (integer, default 0 — e.g. 60 for "1 hour before"), `assignee_id` (user_id, nullable — null = whole household), `created_by`, `created_at`, `updated_at`, `is_active` (boolean default true).
  - `reminder_fires` — append-only log: `id`, `reminder_id`, `fired_at`, `delivery_status` (text: `'sent'` | `'failed'` | `'no_subscriptions'`).
- **Recurrence encoding:** subset of RRULE stored as free text (e.g. `FREQ=WEEKLY;BYDAY=TH;INTERVAL=1`). Forward-compatible with future rules, but the V2 UI only exposes a fixed preset list: Daily, Weekly on day(s) of week, Monthly on the Nth, Yearly on a date. Custom RRULE input deferred to V2.1.
- **RLS:** household members can full-CRUD reminders in their household. `reminder_fires` is SELECT-only.
- **Server-side scheduler:** Supabase `pg_cron` job runs every 1 minute, calling a `SECURITY DEFINER` function `fire_due_reminders()`. The function selects active reminders with `next_fire_at <= now()`, advances `next_fire_at` per the recurrence rule, inserts a `reminder_fires` row, and triggers push delivery (via `pg_net` to `/api/push/send-reminder` or a direct Edge Function call). All in one transaction per reminder.
- **Timezone handling:** new `timezone` column on `households` (text, default `'Australia/Sydney'`, settable in household settings). Recurrence presets are computed in household timezone (so "every Thursday" means Thursday in your timezone, not UTC). `next_fire_at` stored as UTC.
- **New `/reminders` route under `(app)/`:** list view grouped by Today / This week / Later. Empty state with two example presets ("Bin night — every Thursday", "Rent — every 1st of the month") that pre-fill the create sheet.
- **Bottom-sheet create/edit:** title, recurrence preset picker with a live "Next 3 fires:" preview, optional notes, optional assignee, lead-minutes preset (on time / 15 min / 1 hour / 1 day before).
- **BottomNav:** new Bell tab. Badge count = reminders due today (locally computed from cached reminders, no extra query).
- **Realtime:** household-scoped channel on `reminders` table — edits propagate live.
- **Push payload:** `{ kind: 'reminder', reminder_id, title, household_id }`. Notification click deep-links to `/reminders?focus=<id>`.
- **Onboarding:** first time a household member enters `/reminders`, show a one-time empty-state explainer with the two example presets.

**Decisions to ratify at kickoff:**

- Whether tasks and reminders share a single `events` table with a discriminator column or live as separate tables. Lean: **separate** — the data shapes diverge (recurrence vs. completion) and the schema savings don't outweigh the UX clarity cost. Pressure-test at kickoff.
- Whether `fire_due_reminders()` calls push send directly (via `pg_net`) or enqueues a job that an Edge Function drains. Lean: direct — fewer moving parts, acceptable at V2 scale.

**Edge cases for QA (M20):** reminder edited mid-fire (row lock), assignee removed from household (fall back to whole household), reminder with `next_fire_at` in the past (fires once on next cron tick then advances), DST transitions (Thursday at 7pm local survives DST shift).

**Done when:** A household member can create "Bin night — every Thursday at 7pm, 1 hour lead". At 6pm every Thursday, all household members with push enabled receive a notification. Tapping it opens the reminder. Editing recurrence to "every other Thursday" updates `next_fire_at` correctly. Deleting the reminder stops it firing.

---

### M18 — Household Tasks

**~4–5 days**

Migrates users off the "Todos" list workaround. Similar shape to reminders but no scheduler — tasks are completion-tracked, not fire-and-forget.

**Deliverables:**

- **Schema:**
  - `tasks` — `id`, `household_id`, `title`, `notes` (optional), `assignee_id` (user_id, nullable), `due_date` (date, nullable — date-only, no time), `is_completed` (boolean default false), `completed_at` (timestamptz, nullable), `completed_by` (user_id, nullable), `created_by`, `created_at`, `updated_at`.
  - No recurrence column — recurring tasks deferred to V2.1. A truly scheduled chore ("water plants every Monday") fits the reminder primitive (M17) better.
- **RLS:** household members can full-CRUD tasks in their household.
- **New `/tasks` route under `(app)/`:** default view = Open tasks (sorted by due date asc, undated last), then Completed (collapsed, last 30 days). Filter chips: All / Mine / Unassigned / Overdue.
- **Bottom-sheet create/edit:** title, notes, due date picker (optional), assignee picker (optional, defaults to creator).
- **BottomNav:** new Tasks tab. Badge count = open tasks assigned to current user.
- **Realtime:** household-scoped channel on `tasks` table.
- **Push integration (via M16):** when a task is assigned to a user (on create or reassign), send push to that user's subscriptions. Payload: `{ kind: 'task', task_id, title, household_id }`. Body: `"<actor> assigned: <title>"`. Notification deep-links to `/tasks?focus=<id>`.
- **Offline support:** create / complete / edit / delete all queueable via existing `useOfflineQueue` (M5). New queue kinds: `task.create`, `task.update`, `task.delete`.
- **Settings:** Notifications → "Task assignments" toggle (default on).

> **Note on "Todos" list migration.** Only one V1.1 household used a list named "Todos" as a chore workaround. Handled manually by the developer (offline conversation, one-time data move) rather than building in-app migration UX. Revisit if V2 surfaces additional households using the pattern.

**Decisions to ratify at kickoff:**

- Whether to log a `task_activity` row on each state change now or defer until M19. Lean: defer — M19 will need to emit these events anyway; building the log table once is cleaner.

**Edge cases for QA (M20):** assignee leaves household (shown as "Unassigned (former member)" per M3.5 snapshot pattern), task completed while offline (queued, syncs on reconnect), bulk-complete (multi-select chip).

**Done when:** A household member can create "Mow the lawn" with a due date and assign it to a member. The assignee receives a push notification. They can mark it complete from `/tasks` or via the notification action. The list shows it under Completed with the completion timestamp and the marker's name.

---

### M19 — Activity Feed + Smart Suggestions

**~4–5 days**

The original V2 features from §12. Lower priority than reminders/tasks (no direct user demand) but high payoff once those primitives exist — both feed off the data they produce.

**Deliverables:**

- **Activity feed schema:** new `household_activity` table — `id`, `household_id`, `actor_id`, `actor_name_snapshot` (text), `kind` (text: `'item_added'` | `'item_checked'` | `'trip_finished'` | `'reminder_fired'` | `'task_completed'` | `'task_assigned'` | `'member_joined'`), `target_id` (text, polymorphic), `target_label_snapshot` (text — item name, reminder title, etc.), `created_at`. Append-only. RLS: household members SELECT only.
- **Activity writers:** `AFTER` triggers on `list_items`, `shopping_trips`, `reminder_fires`, `tasks`, `household_members` to insert activity rows. Decision at kickoff: triggers vs. application-side writes (lean: triggers — single source of truth, can't be forgotten).
- **New `/activity` route under `(app)/`:** reverse chronological feed, grouped by day. Cursor pagination (PAGE_SIZE=30) per the M12 history pattern. Realtime INSERT subscription for live updates.
- **Self-mute setting:** Settings → Activity → "Hide my own actions" toggle (default ON — most users don't want their own activity in the feed). Kickoff decision: keep the toggle vs. always hide self-actions.
- **Smart suggestions:** new `useSmartSuggestions` hook queries `shopping_trip_items` for the household over the last 90 days, computes per-item frequency, surfaces items appearing in ≥ 3 trips that aren't currently on the active list.
- **Suggestions UI:** passive chip row above the add-item bar — "You usually buy: Milk · Bread · Eggs". Tap a chip → add. × → dismiss for 14 days (per-user localStorage, no server state).
- **"Make it a staple" upsell:** when a non-recurring item has been added in ≥ 4 trips in 90 days, the chip copy switches to "Make Milk a staple?" → tap calls the existing M11 `is_recurring=true` mutation. Reuses existing flow, no new mutation.
- **BottomNav:** Activity tab badge = unseen activity rows since last `/activity` open (per-user timestamp in localStorage).

**Done when:** Opening `/activity` shows a reverse-chronological feed of household actions across the last week. Adding a new item triggers a new activity row visible to other members in realtime. On `/list`, a household with ≥ 4 shopping trips sees a "You usually buy: …" chip row above the input bar; tapping adds the item.

---

### M20 — QA, Edge Cases & V2 Launch

**~3–4 days**

Mirrors M14 for V2 — real-device sweep, Lighthouse audit, cross-browser, V2-specific edge cases. Larger surface than M14 because V2 introduces three new tabs (Reminders, Tasks, Activity) and one new piece of infrastructure (push).

**Deliverables:**

- Full happy-path on real devices across the new flows: smarter categories (online + offline + override) → enable push notifications → create + receive a reminder → create + assign + complete a task → view activity → accept + dismiss a smart suggestion.
- V2-specific edge cases:
  - Push permission denied or revoked mid-session — UI reflects state; orphan server subscription cleaned up on next send (410/404 sweep).
  - Recurring reminder fires while every device is offline — notification arrives on next device reconnect (best effort; document Web Push retention per browser).
  - Reminder created with `next_fire_at` in the past — fires once on next cron tick, then advances.
  - DST transition — Thursday reminder still fires Thursday in household timezone.
  - Task assignee leaves household — shown as former member, task reassignable.
  - Smart-category Edge Function rate-limit hit — graceful "Other" fallback, no error UX.
  - Activity feed for households with no actions yet — empty state.
  - Smart suggestion dismissed — does not reappear for 14 days.
- Lighthouse audit on V2 routes (`/list`, `/reminders`, `/tasks`, `/activity`): Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90, PWA ✓.
- Cross-browser sweep: Chrome (Android), Safari (iOS 16.4+ installed PWA), Chrome (desktop), Safari (desktop), Firefox (desktop). Push-notification delivery tested explicitly on each.
- Sentry confirmed receiving events for: reminder cron failures (server-side), push send failures (transient 410/404), Edge Function categorisation failures and rate-limit hits.
- `docs/release-notes/v2.md` drafted per the M14 pattern. Six household-friendly sections (Smarter categories, Notifications, Reminders, Tasks, Activity, Smart suggestions) plus a "We heard you" section calling out each piece of post-V1.1 feedback and where it landed.
- `docs/m20_test_plan.md` written at kickoff per the M14 pattern.
- Dev seams removed: the M16 `/api/push/test` route deleted in M20 close-out.

**Done when:** All ≥ 25 V1.1 households have been notified of V2 via `docs/release-notes/v2.md`. Reminders and tasks tested end-to-end by ≥ 3 households. Push notification successfully delivered on at least one Android and one iOS installed PWA. No P0/P1 bugs open.

---

### M15–M20 Summary

| Milestone | Focus                             | Est. Days | Cumulative |
| --------- | --------------------------------- | --------- | ---------- |
| M15       | Smarter Categories                | 4–5       | 5          |
| M16       | Push Notifications Infrastructure | 3–4       | 9          |
| M17       | Household Reminders               | 5–6       | 15         |
| M18       | Household Tasks                   | 4–5       | 20         |
| M19       | Activity Feed + Smart Suggestions | 4–5       | 25         |
| M20       | QA, Edge Cases & V2 Launch        | 3–4       | 29         |

**Total: ~5–6 weeks** working evenings and weekends as a solo developer. Larger than V1.1 (~3–4 weeks) because V2 introduces three new tabs plus push infrastructure.

> **Note on positioning.** If V2 ships, "Pantry Run" undersells the product — the app becomes a household coordination tool with shopping as the flagship feature. Renaming is a meaningful decision (icon, manifest, domain, App Store strategy when V3 ships native). Decide at M17 / M18 kickoff when the new primitives are concrete, not now.

> **Note on native port deferral.** The original §12 V2 line included "Begin React Native port (Expo)". With M15–M20 already a full V2 surface area, and iOS Web Push working for installed PWAs since 16.4 (covers most of the current ~25-household audience), the native port slips to V3 alongside monetisation. Lets the V2 value prop be validated on PWA before paying the native cost.

> **Note on deferred feedback.** Budget tracking (feedback #2) already sits in V4 (§12) — revisit at V3 kickoff once monetisation is live. Cross-store price comparison (feedback #4) is not scoped — requires either user-supplied price entry (unlikely to be sustained) or third-party price APIs per store (commercial agreements). Revisit only if multiple V2 users ask.

> **Note on V2.1 candidates.** Custom RRULE input (M17), recurring tasks (M18), and a richer activity feed with filter/search (M19) are all natural V2.1 follow-ups. Defer until V2 ships and post-V2 feedback surfaces what's actually missing.

---

## 12. Incremental Upgrade Roadmap

```
V1 — PWA (Weeks 1–6)
  └── Next.js PWA on Vercel
  └── Core list, real-time sync, household invite, guest auth, offline
  └── Works in browser; installable via Safari (iOS) and Chrome (Android)

V1.1 — Continuity & Trust (Weeks 7–10)
  └── Item quantity (g, kg, mL, L, piece, can, dozen) and notes
  └── Full auth — email + Google Sign-In, account recovery
  └── Multiple lists per household
  └── Recurring / staple items (introduces shopping trip model)
  └── Shopping history (view + restore items from past trips)
  └── Sentry — error tracking + source-map upload (deferred from M7)

V2 — Household Coordination (Months 4–6)  -- reshaped from post-V1.1 feedback; see §11.6
  └── Smarter category detection (LLM-cached for unknown items)
  └── Push notifications infrastructure (Web Push for installed PWAs)
  └── Household reminders (bin day, rent day — scheduled + push)
  └── Household tasks / chores (mow lawn, plumbing — tracked completion)
  └── Activity feed + smart suggestions (deferred from original V2 list)
  └── Native port deferred to V3 — validate household-coordination value prop on PWA first

V3 — Native App + Monetisation (Months 7–12)
  └── React Native (Expo) port — same Supabase backend, shared logic
  └── Ship to App Store (Apple $99/yr) and Google Play ($25 one-time)
  └── RevenueCat integration for subscription management
  └── Free tier (ads via AdMob) + Pro tier (ad-free + premium features)
  └── Meal planner → auto-generates grocery list

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
| Invite code abuse (strangers joining household)             | Low        | Medium | Codes expire after 7 days and owners can rotate on demand (M3.5 F4); add "approve join request" in V1.1  |
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

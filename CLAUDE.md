# Pantry Run — Claude Code Instructions

> Read this file fully before writing any code, running any command, or making any decisions.
> This is the single source of truth for how this project is built.

---

## 1. Project Overview

**Pantry Run** is a real-time collaborative shopping list PWA for households.
One person creates a household, shares a 6-character invite code, and everyone is on the same live list instantly — no account required to start.

- **V1 delivery:** Progressive Web App (Next.js + Vercel)
- **Future:** React Native (Expo) when monetisation begins
- **Backend:** Supabase (Postgres + Realtime + Auth) — shared across V1 and future native

Full product context: `docs/plan.md`
Full design system: `docs/design_document_guidelines.md`

---

## 2. Current Milestone

```
ACTIVE: none — V2 shipped 2026-06-01 (M15→M18 + M20 QA; M19 deprioritised). V2.1 candidates: custom RRULE input, recurring tasks. Activity / suggestions only revisited on explicit user demand.
```

Update this line when starting a new milestone. V1 milestone definitions are in `docs/plan.md` Section 11; V1.1 in Section 11.5; V2 in Section 11.6.

| #                               | Milestone                             | Status                                                                                                                          |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| M0                              | Scaffold & Infrastructure             | ✅ Done                                                                                                                         |
| M1                              | Guest Auth & Session Persistence      | ✅ Done                                                                                                                         |
| M2                              | Household Create & Join               | ✅ Done                                                                                                                         |
| M3                              | Shopping List Core (CRUD)             | ✅ Done                                                                                                                         |
| M3.5                            | Testing & Feedback                    | ✅ Done                                                                                                                         |
| M4                              | Real-Time Sync                        | ✅ Done                                                                                                                         |
| M5                              | Offline Support                       | ✅ Done                                                                                                                         |
| M6                              | PWA Polish & Install                  | ✅ Done                                                                                                                         |
| M7                              | QA, Edge Cases & Launch               | ✅ Done                                                                                                                         |
| **V1.1 — Continuity & Trust**   |                                       |                                                                                                                                 |
| M8                              | Item Quantity & Notes                 | ✅ Done                                                                                                                         |
| M9                              | Full Account Upgrade (Email)          | ✅ Done                                                                                                                         |
| M10                             | Multiple Lists per Household          | ✅ Done                                                                                                                         |
| M11                             | Recurring / Staple Items + Trip Model | ✅ Done                                                                                                                         |
| M12                             | Shopping History                      | ✅ Done                                                                                                                         |
| M13                             | Sentry & Observability                | ✅ Done                                                                                                                         |
| M14                             | QA, Edge Cases & V1.1 Launch          | ✅ Done                                                                                                                         |
| **V2 — Household Coordination** |                                       |                                                                                                                                 |
| M15                             | Smarter Categories                    | ✅ Done                                                                                                                         |
| M16                             | Push Notifications Infrastructure     | ✅ Done                                                                                                                         |
| M17                             | Household Reminders                   | ✅ Done                                                                                                                         |
| M18                             | Household Tasks                       | ✅ Done                                                                                                                         |
| M19                             | Activity Feed + Smart Suggestions     | 🚫 Deprioritised — no user demand; "minimal and intuitive" is the loudest post-M18 signal (2026-05-31). See `docs/plan.md` §M19 |
| M20                             | QA, Edge Cases & V2 Launch            | ✅ Done                                                                                                                         |

---

## 3. Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000
npm run build            # Production build
npm run start            # Start production server locally

# Code quality (run before every commit)
npm run lint             # ESLint
npm run lint:fix         # ESLint with auto-fix
npm run type-check       # TypeScript check (no emit)
npm run format           # Prettier format

# Supabase
npx supabase start       # Start local Supabase (Docker required)
npx supabase db push     # Push migrations to remote
npx supabase db reset    # Reset local DB and re-run migrations
npx supabase gen types typescript --local > src/lib/database.types.ts  # Regenerate types
```

**Before running any Supabase commands**, check that `.env.local` exists and contains the correct keys.

---

## 4. Tech Stack & Versions

| Layer      | Technology                          | Notes                                                                           |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router)             | Never use Pages Router                                                          |
| Language   | TypeScript 5 (strict)               | No `any` types                                                                  |
| Runtime    | React 19                            | Server components by default                                                    |
| Styling    | Tailwind CSS v4                     | Tokens declared via `@theme` in `src/app/globals.css` (no `tailwind.config.ts`) |
| State      | Zustand v5                          | Client state only                                                               |
| Database   | Supabase (PostgreSQL)               | Via `@supabase/supabase-js` v2                                                  |
| Real-time  | Supabase Realtime                   | WebSocket subscriptions                                                         |
| Auth       | Supabase Auth                       | Anonymous → email/password upgrade (Google deferred to V2)                      |
| Offline    | hand-rolled SW + idb                | `public/sw.js` (no Workbox / next-pwa) + IndexedDB queue & cache                |
| Icons      | Lucide React                        | `lucide-react` package                                                          |
| Fonts      | Plus Jakarta Sans, DM Sans, DM Mono | Via `next/font/google`                                                          |
| Monitoring | Sentry (`@sentry/nextjs`)           | Errors only — no Replay, no Performance, no Profiling (V1.1)                    |
| Push       | `web-push` + VAPID                  | Server-side send via `src/lib/push/send.ts` (M16); SW handles `push` events     |
| Hosting    | Vercel                              | Auto-deploy on push to `main`                                                   |

---

## 5. Project Structure

All application source code lives inside `src/`. Config files, `docs/`, `public/`, and `supabase/` stay at the repo root.
The `@/*` import alias resolves to `src/*` (e.g. `@/lib/supabase/client` → `src/lib/supabase/client.ts`).

```
pantry-run/
├── src/                              # All application source code
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Unauthenticated routes
│   │   │   ├── welcome/page.tsx      # Onboarding welcome screen
│   │   │   ├── create/page.tsx       # Create household
│   │   │   └── join/page.tsx         # Join with invite code
│   │   ├── (app)/                    # Authenticated routes (session required)
│   │   │   ├── list/page.tsx         # Main shopping list
│   │   │   ├── plan/page.tsx         # Reminders + Tasks (M17 / M18)
│   │   │   ├── history/page.tsx     # Shopping history (M12)
│   │   │   ├── household/page.tsx    # Household management
│   │   │   └── settings/page.tsx     # User settings
│   │   ├── api/                      # API route handlers
│   │   ├── layout.tsx                # Root layout (fonts, providers)
│   │   ├── page.tsx                  # Root redirect (→ /welcome or /list)
│   │   ├── global-error.tsx          # Top-level error boundary (M13 Sentry)
│   │   └── globals.css               # Global styles + CSS custom properties
│   │
│   ├── components/
│   │   ├── ui/                       # Base design system components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Sheet.tsx             # Bottom sheet modal
│   │   │   ├── Toast.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── list/                     # List-specific components
│   │   │   ├── ListItem.tsx          # Single list item row
│   │   │   ├── AddItemBar.tsx        # Pinned bottom input bar
│   │   │   ├── CategorySection.tsx   # Collapsible category group
│   │   │   ├── CheckedSection.tsx    # Collapsed checked items group
│   │   │   └── EmptyState.tsx
│   │   ├── history/                  # M12 history components
│   │   │   ├── TripCard.tsx          # Single trip row
│   │   │   ├── TripDetailSheet.tsx   # Trip items + restore actions
│   │   │   ├── MonthGroup.tsx        # Month section heading
│   │   │   └── EmptyState.tsx        # No-trips / offline empty
│   │   ├── plan/                     # M17 reminders + M18 tasks + V2 UI primitives
│   │   │   ├── SegmentedControl.tsx  # Design-system §7.16 (Plan tabs)
│   │   │   ├── FilterChipRow.tsx     # Design-system §7.17 (Tasks filter)
│   │   │   ├── RemindersList.tsx     # Today / This week / Later sections
│   │   │   ├── ReminderRow.tsx       # Title + next-fire + assignee
│   │   │   ├── ReminderEditSheet.tsx # Create/edit; Next-3-fires preview
│   │   │   ├── RecurrencePresetPicker.tsx
│   │   │   ├── LeadMinutesPicker.tsx
│   │   │   ├── AssigneePicker.tsx    # Used by both reminders + tasks (unassignedLabel prop)
│   │   │   ├── RemindersEmpty.tsx    # Onboarding + example presets
│   │   │   ├── PlanRemindersView.tsx
│   │   │   ├── TasksList.tsx         # M18 Open + Completed (collapsed) sections
│   │   │   ├── TaskRow.tsx           # Checkbox + title + due chip + assignee
│   │   │   ├── TaskEditSheet.tsx     # Create/edit; due-date picker
│   │   │   ├── TasksEmpty.tsx        # M18 onboarding + example tasks
│   │   │   ├── PlanTasksView.tsx     # M18 — filter chips + list + FAB
│   │   │   └── format.ts             # Bucket + label helpers (device tz)
│   │   ├── household/
│   │   │   ├── InviteCode.tsx        # Invite code display + share
│   │   │   ├── TimezoneSection.tsx   # M17 household timezone editor
│   │   │   └── MemberList.tsx
│   │   └── layout/
│   │       ├── AppShell.tsx          # Main app wrapper
│   │       ├── Header.tsx            # Top bar with household name
│   │       ├── BottomNav.tsx         # Tab nav (V2: List/Plan/History/Avatar)
│   │       ├── AvatarMenuChip.tsx    # Design-system §7.19
│   │       └── AvatarMenuSheet.tsx   # Household + Settings + Sign out
│   │
│   ├── hooks/
│   │   ├── useSession.ts             # Auth session state
│   │   ├── useHousehold.ts           # Current household + members
│   │   ├── useList.ts                # List items + Realtime subscription
│   │   ├── useHistory.ts             # Shopping trips (M12) + Realtime INSERT
│   │   ├── useTripItems.ts           # Lazy fetch for one trip's items
│   │   ├── useReminders.ts           # M17 reminder CRUD (online-only)
│   │   ├── useTasks.ts               # M18 task CRUD (offline-queueable)
│   │   ├── useOfflineQueue.ts        # IndexedDB write queue
│   │   └── useNetworkStatus.ts       # Online/offline detection
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client (singleton)
│   │   │   └── server.ts             # Server component Supabase client
│   │   ├── categories.ts             # Item name → category keyword dictionary
│   │   ├── database.types.ts         # Generated Supabase TypeScript types
│   │   ├── hashUserId.ts             # SHA-256 → 16 hex chars (M13 Sentry user id)
│   │   ├── recurrence.ts             # M17 RRULE subset + nextFire mirror
│   │   └── utils.ts                  # General helpers (cn, formatDate, etc.)
│   │
│   ├── store/
│   │   ├── userStore.ts              # userId, isAnonymous, displayName
│   │   ├── householdStore.ts         # householdId, name, timezone, members
│   │   ├── listStore.ts              # items, optimistic updates
│   │   ├── reminderStore.ts          # M17 reminders cache
│   │   └── taskStore.ts              # M18 tasks cache
│   │
│   ├── proxy.ts                      # Auth proxy (Next.js 16) — protects (app) routes
│   ├── instrumentation.ts            # Server runtime register() hook (M13 Sentry)
│   └── instrumentation-client.ts     # Client runtime Sentry init (M13)
│
├── sentry.server.config.ts           # Node runtime Sentry init (M13)
├── sentry.edge.config.ts             # Edge runtime Sentry init (M13)
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── public/
│   ├── icons/                        # PWA icons
│   └── manifest.json
│
├── docs/
│   ├── plan.md                       # Full product & engineering plan
│   └── design_document_guidelines.md
│
├── .github/
│   └── workflows/
│       └── ci.yml                    # Type-check + lint on PRs
│
├── .env.example
├── .env.local                        # Never commit — gitignored
├── CLAUDE.md                         # This file
├── CLAUDE.local.md                   # Personal overrides — gitignored
├── next.config.ts
├── postcss.config.mjs
├── .prettierrc
├── eslint.config.mjs
└── tsconfig.json
```

> **Tailwind v4 note:** there is no `tailwind.config.ts`. Design tokens (colours, fonts, easings, etc.) are declared with `@theme` directives at the top of `src/app/globals.css`. See Section 10.

---

## 6. Environment Variables

```bash
# Required — get from Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Sentry — optional locally, required in production (M13).
# Get DSN from Sentry dashboard → Settings → Projects → pantry-run → Client Keys.
# Leaving NEXT_PUBLIC_SENTRY_DSN unset silently disables Sentry, keeping `npm run dev` quiet.
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=

# Vercel-only — build-time source-map upload. Never put these in .env.local.
# SENTRY_ORG=
# SENTRY_PROJECT=
# SENTRY_AUTH_TOKEN=

# Gemini — server-only, lives in Supabase secrets (M15). Powers the
# categorize_item Edge Function. Set once via:
#   npx supabase secrets set GEMINI_API_KEY=<your-key>
# For local function testing, put it in supabase/functions/.env (gitignored)
# and start the function with --env-file supabase/functions/.env.
# GEMINI_API_KEY — never in .env.local

# Supabase service-role — server-only (M16). Used by src/lib/push/send.ts
# to fan out notifications across users in a household (RLS would block
# cross-user reads). Never expose to the client. Set on Vercel (Production
# + Preview), local from `npx supabase status`.
SUPABASE_SERVICE_ROLE_KEY=

# VAPID — Web Push key pair (M16). Public key ships to the browser to
# identify your server in PushSubscription.subscribe(). Private key signs
# every send. Generate with `npx web-push generate-vapid-keys --json`.
# VAPID_SUBJECT must be a mailto: or https:// URL (spec requirement).
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com

# Cron — server-only (M17). The pg_cron job fire_due_reminders() POSTs the
# new fire ids to /api/cron/fire-reminders with `Authorization: Bearer
# ${CRON_SECRET}`. The route validates against this env. The same value must
# also live in the DB: `update public.app_settings set value = '<secret>'
# where key = 'cron_secret';`. Generate with `openssl rand -hex 32`. Vercel:
# Production + Preview env. Local default 'local-dev-cron-secret' ships in
# the M17 migration.
CRON_SECRET=
```

Never commit `.env.local`. Never hardcode these values in any file.

---

## 7. Database Schema

Fourteen tables, all with Row Level Security (RLS) enabled.

```sql
households
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  name          text NOT NULL
  invite_code   text UNIQUE NOT NULL    -- 6-char alphanumeric, expires after 7 days (M3.5 F4); owners can regenerate at any time
  code_expires_at timestamptz NOT NULL
  timezone      text NOT NULL DEFAULT 'Australia/Sydney'  -- M17 — IANA name, anchor for reminder recurrence math; editable by any member via set_household_timezone RPC
  created_at    timestamptz DEFAULT now()

household_members
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  role          text NOT NULL DEFAULT 'member'  -- 'owner' | 'member'
  display_name  text
  joined_at     timestamptz DEFAULT now()
  UNIQUE(household_id, user_id)

lists
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  name          text NOT NULL DEFAULT 'Shopping List'
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid()  -- M10
  created_at    timestamptz DEFAULT now()

list_items
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  list_id           uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE
  added_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL
  added_by_name     text                                        -- M3.5 snapshot for former members
  name              text NOT NULL
  quantity          text                                        -- legacy free-text, pre-M8 fallback
  quantity_value    numeric(6,2)                                -- M8 canonical
  quantity_unit     text                                        -- M8 canonical: g|kg|mL|L|piece|can|dozen
  category          text NOT NULL DEFAULT 'Other'
  category_pending  boolean NOT NULL DEFAULT false              -- M15 — true while awaiting LLM categorisation (offline keyword miss); reconnect sweep clears
  is_checked        boolean NOT NULL DEFAULT false
  is_recurring      boolean NOT NULL DEFAULT false              -- M11 staple flag
  checked_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL
  checked_at        timestamptz
  note              text
  sort_order        integer NOT NULL DEFAULT 0
  created_at        timestamptz DEFAULT now()
  updated_at        timestamptz DEFAULT now()

shopping_trips                                                -- M11 append-only trip log
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  list_id       uuid REFERENCES lists(id) ON DELETE SET NULL  -- informational; trips outlive their list
  finished_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL
  finished_at   timestamptz NOT NULL DEFAULT now()
  item_count    integer NOT NULL DEFAULT 0

shopping_trip_items                                           -- M11 full snapshot (no FK to list_items)
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  trip_id         uuid NOT NULL REFERENCES shopping_trips(id) ON DELETE CASCADE
  name            text NOT NULL
  quantity        text
  quantity_value  numeric(6,2)
  quantity_unit   text
  category        text NOT NULL DEFAULT 'Other'
  note            text
  was_recurring   boolean NOT NULL DEFAULT false
  added_by_name   text
  created_at      timestamptz DEFAULT now()

category_overrides                                            -- M15 global LLM cache, shared across all households
  normalised_name text PRIMARY KEY                            -- lowercased + whitespace-collapsed
  category        text NOT NULL CHECK (in CATEGORY_ORDER)
  source          text NOT NULL CHECK (in 'llm'|'keyword'|'manual')
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

household_category_overrides                                  -- M15 per-household manual corrections
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  normalised_name text NOT NULL
  category        text NOT NULL CHECK (in CATEGORY_ORDER)
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()
  PRIMARY KEY (household_id, normalised_name)
  -- AFTER INSERT/UPDATE trigger propagates non-'Other' rows to category_overrides (source='manual')

category_request_counters                                     -- M15 per-day per-household LLM rate limit + observability
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  day             date NOT NULL
  count           integer NOT NULL DEFAULT 0                  -- total LLM calls today (rate-limit gate: 150/day)
  cache_hits      integer NOT NULL DEFAULT 0
  cache_misses    integer NOT NULL DEFAULT 0
  updated_at      timestamptz DEFAULT now()
  PRIMARY KEY (household_id, day)
  -- Service-role writes only, via the increment_category_counter SECURITY DEFINER RPC called from the categorize_item Edge Function

push_subscriptions                                            -- M16 one row per (user, browser endpoint)
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  household_id      uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE  -- denormalised for fan-out
  endpoint          text NOT NULL                                              -- Web Push endpoint URL
  p256dh            text NOT NULL                                              -- subscription.keys.p256dh
  auth              text NOT NULL                                              -- subscription.keys.auth
  user_agent_label  text                                                       -- coarse label e.g. "iPhone Safari"
  created_at        timestamptz NOT NULL DEFAULT now()
  updated_at        timestamptz NOT NULL DEFAULT now()
  UNIQUE (user_id, endpoint)
  -- household_id is synced by the app at /api/push/subscribe time (hook re-POSTs on boot so household changes self-heal)

reminders                                                     -- M17 household reminder schedule
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  title         text NOT NULL                                                  -- 1..120 chars
  notes         text                                                           -- optional, ≤500
  recurrence    text                                                           -- RRULE subset (FREQ=DAILY|WEEKLY|MONTHLY|YEARLY with BYDAY/BYMONTHDAY/BYMONTH); null = one-shot
  next_fire_at  timestamptz NOT NULL                                           -- UTC; event time, NOT (event - lead). lead is subtracted by the cron at compare time
  lead_minutes  integer NOT NULL DEFAULT 0 CHECK (0..10080)                    -- on time / 15 / 60 / 1440 in V2; UI exposes 4 presets
  assignee_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL              -- null = whole household push fan-out
  is_active     boolean NOT NULL DEFAULT true                                  -- one-shots flip false after firing
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
  created_at    timestamptz NOT NULL DEFAULT now()
  updated_at    timestamptz NOT NULL DEFAULT now()

reminder_fires                                                -- M17 append-only delivery log
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  reminder_id     uuid NOT NULL REFERENCES reminders(id) ON DELETE CASCADE
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  fired_at        timestamptz NOT NULL DEFAULT now()
  delivery_status text NOT NULL DEFAULT 'pending'                              -- 'pending' | 'sent' | 'failed' | 'no_subscriptions'
  delivery_detail text                                                         -- "sent=N expired=N failed=N"; the cron route writes back after fan-out
  -- SELECT-only RLS for household members; writes happen via fire_due_reminders() (SECURITY DEFINER) and the cron route (service-role)

app_settings                                                  -- M17 server-only config (cron endpoint + secret)
  key   text PRIMARY KEY
  value text NOT NULL
  -- RLS enabled with no policies = authenticated clients can't read; service-role + SECURITY DEFINER bypass
  -- Two rows ship with local-dev defaults; operators overwrite on prod via SQL editor

tasks                                                         -- M18 assignable household chores (no scheduler)
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120)
  notes         text CHECK (notes IS NULL OR char_length(notes) <= 500)
  assignee_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL              -- null = unassigned (no push fan-out)
  due_date      date                                                           -- date-only, all-day; null = undated, sorted last
  is_completed  boolean NOT NULL DEFAULT false
  completed_at  timestamptz                                                    -- paired with is_completed via CHECK
  completed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
  created_at    timestamptz NOT NULL DEFAULT now()
  updated_at    timestamptz NOT NULL DEFAULT now()
  CHECK ((is_completed = false AND completed_at IS NULL) OR (is_completed = true AND completed_at IS NOT NULL))
  -- Indexes (partial): open-by-due, completed-by-completed-at, open-by-assignee (BottomNav badge)
```

**RLS rules (enforce in every migration):**

- Users can only SELECT/INSERT/UPDATE/DELETE `list_items` in lists belonging to their household
- Users can only SELECT/INSERT `household_members` for their own household
- `shopping_trips` and `shopping_trip_items` are SELECT-only for household members; writes happen via the `finish_shopping(p_list_id)` SECURITY DEFINER RPC
- `category_overrides` is publicly readable by authenticated users; writes only via the `categorize_item` Edge Function (service-role)
- `household_category_overrides` is full-CRUD for household members; the propagation trigger writes through to `category_overrides`
- `category_request_counters` is SELECT-only for household members; writes only via the `categorize_item` Edge Function (service-role) through the atomic `increment_category_counter` RPC
- `push_subscriptions` is full-CRUD for the owning user only (`user_id = auth.uid()`); fan-out sends use the service-role client (`src/lib/supabase/admin.ts`)
- `reminders` is full-CRUD for household members; `households.timezone` is editable by any member via the `set_household_timezone(uuid, text)` SECURITY DEFINER RPC (the table's UPDATE policy remains owner-only otherwise)
- `reminder_fires` is SELECT-only for household members; writes happen via the `fire_due_reminders()` SECURITY DEFINER plpgsql function (called by `pg_cron`) and the `/api/cron/fire-reminders` route (service-role)
- `app_settings` has RLS enabled with no policies — authenticated clients are default-denied. Service-role + SECURITY DEFINER functions can read/write. Two rows (`fire_reminders_endpoint`, `cron_secret`) are populated by the M17 migration with local-dev defaults; prod operators overwrite via the SQL editor
- `tasks` is full-CRUD for household members. Assignment-push delivery uses `/api/push/task-assigned` (Node runtime), which verifies the caller via RLS then fans out via `sendToUser(assignee_id)` using the service-role client
- Invite codes are publicly readable for validation; all other household data requires membership

**Never** query Supabase without a user session attached. Always use the client from `src/lib/supabase/client.ts` on the browser and `src/lib/supabase/server.ts` in server components.

---

## 8. TypeScript Conventions

```typescript
// ✅ Always explicit prop types
interface ListItemProps {
  item: ListItem
  onCheck: (id: string) => void
  onDelete: (id: string) => void
}

// ✅ Use generated DB types from src/lib/database.types.ts
import type { Database } from '@/lib/database.types'
type ListItem = Database['public']['Tables']['list_items']['Row']

// ✅ Return types on all async functions
async function fetchListItems(listId: string): Promise<ListItem[]> {}

// ❌ Never use `any`
// ❌ Never use `as unknown as X` to escape types
// ❌ Never use non-null assertion `!` without a comment explaining why it's safe
```

Strict mode is on in `tsconfig.json`. Do not disable any strict checks.

---

## 9. Component Conventions

```typescript
// ✅ Server component by default — no directive needed
export default function HouseholdPage() {}

// ✅ Client component — only when using hooks, events, or browser APIs
;('use client')
export default function AddItemBar() {}

// ✅ All components in their own file, named export + default export
export function ListItem({ item, onCheck }: ListItemProps) {}
export default ListItem

// ✅ Co-locate types with the component file
// ✅ No business logic in components — use hooks
// ✅ No Supabase calls in JSX — call in hooks or server components
// ❌ No inline styles — Tailwind classes only
// ❌ No hardcoded colours — use design token classes (see Section 10)
```

**Supabase calls belong in:**

- `src/hooks/` — for client-side data fetching with real-time
- Server components directly — for initial page data
- `src/app/api/` route handlers — for mutations that need server-side logic

**Never** call Supabase inside a component's JSX or event handler directly.

---

## 10. Design System — Critical Rules

Full spec in `docs/design_document_guidelines.md`. These are the rules that must be followed in every component without exception.

### Colours (Tailwind classes only)

```
Background base:     bg-[#F7F6F3]   (light) / bg-[#18181A]   (dark)
Background surface:  bg-white        (light) / bg-[#242426]   (dark)
Text primary:        text-[#1C1C1A]  (light) / text-[#F0EFEC] (dark)
Text secondary:      text-[#6B6860]  (light) / text-[#9E9A92] (dark)
Primary accent:      bg-[#3D8055] / text-[#3D8055]
Error / destructive: text-[#C0392B] / bg-[#C0392B]
Border:              border-[#E4E2DC]
```

All colours must be declared in the `@theme` block in `src/app/globals.css` as named tokens (e.g. `--color-bg-base`, `--color-accent`, `--color-text-primary`), then used via the auto-generated Tailwind utilities (`bg-bg-base`, `text-accent`). Never write raw hex values in component files.

### Typography (always use these sizes)

```
display-lg:  text-[32px] leading-tight font-bold      (page titles — rare)
display-sm:  text-[24px] leading-snug font-bold       (section titles, empty state)
heading-lg:  text-[20px] leading-snug font-semibold   (card titles, modal headers)
heading-sm:  text-[17px] leading-normal font-semibold (category headers)
body-lg:     text-[16px] leading-relaxed              (list item names — NEVER smaller)
body-sm:     text-[14px] leading-relaxed              (quantity, metadata)
label:       text-[13px] leading-snug font-medium     (buttons, chips, input labels)
caption:     text-[12px] leading-snug                 (timestamps, "added by")
code:        font-mono text-[14px]                    (invite codes only)
```

### Spacing (4px base scale)

Use Tailwind spacing — `p-4` = 16px, `p-2` = 8px, `gap-3` = 12px, etc.
Page horizontal padding: always `px-4` (16px). Never less.

### Touch Targets

- Minimum tap target: `min-h-[44px] min-w-[44px]` on all interactive elements
- List item checkbox zone: `w-12 h-12` (48px)
- Bottom nav tabs: full width × `h-14` (56px)

### Rounded Corners

```
Small elements (chips, badges):  rounded-lg   (8px)
Inputs, cards:                   rounded-xl   (12px)
Buttons:                         rounded-[14px]
Bottom sheets:                   rounded-t-2xl (20px top only)
```

### Icons

- Library: Lucide React only — no other icon libraries
- Size: `size={20}` for nav/header, `size={18}` for inline
- Stroke width: always `strokeWidth={1.5}`
- Never icon-only interactive elements without `aria-label`

### Animations

```typescript
// Standard durations — use these, not arbitrary values
'duration-150'   // Hover states, button presses
'duration-[250ms]' // Checkboxes, item add/remove
'duration-[350ms]' // Sheet open/close, page transitions

// Standard easings (declared in @theme in globals.css)
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)   /* use as `ease-out-expo` */
--ease-spring:   cubic-bezier(0.32, 0.72, 0, 1)  /* use as `ease-spring` */
```

Always add `@media (prefers-reduced-motion: reduce)` overrides. See `globals.css`.

---

## 11. State Management

Three Zustand stores — keep them separate and focused.

```typescript
// src/store/userStore.ts
interface UserStore {
  userId: string | null
  isAnonymous: boolean
  displayName: string | null
  setUser: (user: User) => void
  clearUser: () => void
}

// src/store/householdStore.ts
interface HouseholdStore {
  householdId: string | null
  name: string | null
  members: Member[]
  setHousehold: (household: Household) => void
  clearHousehold: () => void
}

// src/store/listStore.ts
interface ListStore {
  items: ListItem[]
  isLoading: boolean
  setItems: (items: ListItem[]) => void
  addItemOptimistic: (item: ListItem) => void
  updateItemOptimistic: (id: string, updates: Partial<ListItem>) => void
  removeItemOptimistic: (id: string) => void
  reconcileWithServer: (serverItems: ListItem[]) => void
}
```

**Rules:**

- Zustand for all shared client state
- No `useState` for data that crosses component boundaries
- Optimistic updates go through the store, not local component state
- Server state (from Supabase) flows into the store via hooks — never fetched twice

---

## 12. Offline Strategy

Every write operation follows this pattern:

```
User action
  → Update Zustand store immediately (optimistic)
  → UI reflects change instantly
  → If online: write to Supabase → confirm → done
  → If offline: push to IndexedDB queue
              → show offline banner
              → when network returns: drain queue in order
              → reconcile with server state
```

The `useOfflineQueue` hook manages the IndexedDB queue using the `idb` library.
Conflict resolution: last-write-wins using `updated_at` server timestamp.

---

## 13. Real-Time Subscription Pattern

```typescript
// Standard pattern for all Realtime subscriptions
const channel = supabase
  .channel(`list:${listId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'list_items',
      filter: `list_id=eq.${listId}`,
    },
    (payload) => {
      if (payload.eventType === 'INSERT') listStore.addItemOptimistic(payload.new as ListItem)
      if (payload.eventType === 'UPDATE')
        listStore.updateItemOptimistic(payload.new.id, payload.new)
      if (payload.eventType === 'DELETE') listStore.removeItemOptimistic(payload.old.id)
    },
  )
  .subscribe()

// Always clean up on unmount
return () => {
  supabase.removeChannel(channel)
}
```

Subscriptions are set up in `src/hooks/useList.ts` — never inline in components.

---

## 14. Auth Flow

```
App opens
  → SessionProvider checks for existing Supabase session (stored in HttpOnly cookies via @supabase/ssr)
  → If session exists: hydrate userStore → check household membership (M2) → route to /list or /welcome
  → If no session: call supabase.auth.signInAnonymously()
               → cookie set → hydrate userStore → route to /welcome

Anonymous → Full account upgrade (V1.1):
  → supabase.auth.updateUser({ email, password })
  → All existing data remains — user_id is preserved
```

The `useSession` hook handles all auth state. The proxy in `src/proxy.ts` protects `(app)` routes.

---

## 15. Category Auto-Detection (M15 — three-tier)

`CATEGORY_ORDER` (in `src/lib/categories.ts`) is the single source of truth — 14 entries: Produce, Dairy, Meat, Bakery, Pantry, Frozen, Beverages, Household, Personal Care, **Snacks**, **Condiments & Sauces**, **Baby**, **Pet**, Other. The DB CHECK constraints on `category_overrides.category` and `household_category_overrides.category` enforce the same vocabulary.

Resolution order in `useList.addItem` (sync first, then async fire-and-forget for keyword misses):

1. **Household override** — `useCategoryOverridesStore.byNormalisedName.get(normalised)`. Sync, offline-safe. Map is loaded + kept live by `CategoryOverridesRealtime` (mounted in `AppShell`). A user's manual pick in `EditItemSheet` writes a row to `household_category_overrides`, which an AFTER trigger propagates into the global `category_overrides` cache with `source='manual'` (excluding `'Other'` picks). Always wins — even over the keyword dictionary.
2. **Keyword dictionary** — `detectCategoryKeyword(name): Category | null` in `src/lib/categories.ts`. ~1,000 keywords, AU-first with US/UK synonyms ("yoghurt"+"yogurt", "capsicum"+"bell pepper", "zucchini"+"courgette") and common typos. Multi-word keys for disambiguation ("tomato sauce" → Condiments, "ice cream" → Frozen, "peanut butter" → Condiments). Matcher prefers longest match. Returns `null` on miss.
3. **Remote (LLM) tier** — keyword miss + online: fire-and-forget call to the `categorize_item` Supabase Edge Function (`supabase/functions/categorize_item/`). The function:
   - Verifies the JWT and household membership via RLS on `household_members`.
   - Checks `household_category_overrides` (per-household), then `category_overrides` (global) — both bypass RLS via service-role.
   - On a miss: increments `category_request_counters` (150/day cap per household), then calls Gemini 2.5 Flash through the wrapper at `supabase/functions/categorize_item/llm.ts`. Constrained output via `responseSchema` enum.
   - Writes a fresh LLM result into the global cache and returns `{ category, source }`.

   The wrapper (`llm.ts`) is the seam — swapping Gemini for Haiku / GPT-mini is a one-file change as long as `classify(name): Promise<{ category }>` stays.

**Offline + reconnect:** a keyword miss while offline marks the row `category_pending=true`. On reconnect, `sweepPendingCategories` (in `useList.ts`) walks pending rows and re-runs the remote tier — capped at 20/session, sequential to stay within the rate limit. Triggered on both `SUBSCRIBED` (via `fetchAndReconcile`) and the `online` window event (for brief blips where the socket never disconnected).

**Counters tell the truth:** `category_request_counters.cache_hits` increments only on a real hit; `cache_misses` only on a real LLM call. Inspect via `select * from category_request_counters where day = current_date;` — no per-call Sentry breadcrumbs by design.

**The Edge Function has a cold start.** First call after ~10 min idle from Australia → Seoul region takes ~2–3s (Deno isolate boot + TLS + sequential DB queries). Warm calls run ~300–600ms. Acceptable for a category that resolves while the user moves on; visible as the "Other → real category" flip.

---

## 16. Push Notifications (M16)

Server-side Web Push delivery — used by M17 reminders and M18 task assignment. Three pieces: a VAPID key pair, a `push_subscriptions` table per (user, browser endpoint), and a service-role send helper.

**Payload contract** (sent by `src/lib/push/send.ts`, parsed by `public/sw.js`):

```typescript
type PushPayload = {
  title: string
  body?: string
  kind?: 'reminder' | 'task' | 'test'
  target_id?: string // snake_case — travels straight to the SW unchanged
  household_id?: string
}
```

The SW maps `kind` → route on notification click:

| `kind`     | URL opened                       |
| ---------- | -------------------------------- |
| `reminder` | `/plan?tab=reminders&focus=<id>` |
| `task`     | `/plan?tab=tasks&focus=<id>`     |
| `test`     | `/list` (M16 dev seam)           |

Notifications use `tag: kind:target_id` so re-fires for the same target replace the previous OS notification instead of stacking.

**Sending from server code:**

```typescript
import { sendToUser, sendToHousehold } from '@/lib/push/send'

await sendToUser(userId, {
  title: 'Bin night',
  body: '7pm — tonight',
  kind: 'reminder',
  target_id: reminderId,
})
await sendToHousehold(householdId, payload, { excludeUserId: actorId })
```

Both return `{ sent, expired, failed }`. Expired-subscription cleanup (404/410) is inline — the helper deletes dead rows on the next send, no separate sweep job.

**Subscribing from the client:** `usePushNotifications()` in `src/hooks/`. Handles support detection (incl. iOS-needs-PWA gate), permission prompt, `pushsubscriptionchange` re-subscription, and idempotent self-heal on app boot (re-POST to `/api/push/subscribe` overwrites `household_id` so users who switched households fan-out to the new home).

`SUPABASE_SERVICE_ROLE_KEY` is required server-side for fan-out (RLS would block cross-user reads). Never expose it to the client.

---

## 17. Household Reminders (M17)

Recurring household-wide notifications: "every Thursday is bin night", "rent every 1st". Three pieces — a Postgres recurrence + cron, an API route the cron POSTs to, and the Plan tab UI.

**Scheduling lives in Postgres.** `pg_cron` runs `select fire_due_reminders()` every minute. The function selects active reminders where `next_fire_at - lead_minutes <= now()`, claims them with `FOR UPDATE SKIP LOCKED`, inserts a `reminder_fires` row each, advances `next_fire_at` via `public.next_fire(rrule, base, tz)` (or deactivates one-shots), then POSTs the new fire ids to `/api/cron/fire-reminders` via `pg_net`. The advance loop runs past the backlog so a host that slept doesn't notification-storm the user on resume.

**Recurrence semantics.** An RRULE subset stored as opaque text:

| Preset      | RRULE shape                                  | Example                                |
| ----------- | -------------------------------------------- | -------------------------------------- |
| Daily       | `FREQ=DAILY`                                 | `FREQ=DAILY`                           |
| Weekly      | `FREQ=WEEKLY;BYDAY=…` (multi-day allowed)    | `FREQ=WEEKLY;BYDAY=MO,TH`              |
| Fortnightly | `FREQ=WEEKLY;BYDAY=<single>;INTERVAL=2`      | `FREQ=WEEKLY;BYDAY=TH;INTERVAL=2`      |
| Monthly     | `FREQ=MONTHLY;BYMONTHDAY=N` (1..31, clamped) | `FREQ=MONTHLY;BYMONTHDAY=1`            |
| Yearly      | `FREQ=YEARLY;BYMONTH=M;BYMONTHDAY=N`         | `FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25` |

One-shot = `recurrence is null`. `INTERVAL` only matters on WEEKLY in V2 (single-day Fortnightly); the plpgsql `next_fire` reads it and `nextFire` in TS mirrors. Multi-day + INTERVAL>1 is unreachable from the UI but the plpgsql is forward-progressing in case a row is inserted directly. `next_fire()` returns NULL for one-shots and `fire_due_reminders` flips `is_active=false`. The client mirror at `src/lib/recurrence.ts` produces the same UTC instants the cron will — used by the EditSheet's "Next 3 fires:" preview. The two implementations must stay in lockstep (the Phase 1 smoke verifies seven canonical cases including the AEST↔AEDT boundary).

**Timezone as scheduling anchor.** `households.timezone` (IANA name, default `Australia/Sydney`) is the anchor for the recurrence math. "Every Thursday at 7pm" stays at 7pm local across DST because `next_fire` does the calendar arithmetic in the household tz then re-projects to UTC. Display is always in the **viewer's device tz**, not the household's — so a traveling member sees the equivalent local time. Auto-detected from `Intl.DateTimeFormat().resolvedOptions().timeZone` at create-household time; editable by any member from `/household` via the `set_household_timezone(uuid, text)` RPC.

**`next_fire_at` semantics.** Stores the _event time_, not (event − lead). Cron compares `(next_fire_at - lead_minutes) <= now()`, so editing the lead doesn't require recomputing the schedule.

**Cron route auth.** `/api/cron/fire-reminders` (Node runtime) validates `Authorization: Bearer ${CRON_SECRET}` against the env var; the matching value lives in `public.app_settings.cron_secret` (read by the plpgsql function). Two keys total in `app_settings`:

| key                       | local dev default                                          | prod                                            |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `fire_reminders_endpoint` | `http://host.docker.internal:3000/api/cron/fire-reminders` | `https://<your-vercel>/api/cron/fire-reminders` |
| `cron_secret`             | `local-dev-cron-secret`                                    | `openssl rand -hex 32`                          |

`app_settings` is RLS-on with no policies → authenticated clients are default-denied. Service-role and SECURITY DEFINER both bypass.

**Push payload.** Reuses the M16 contract (`{ title, body?, kind:'reminder', target_id, household_id }`). The SW maps `kind:'reminder'` → `/plan?tab=reminders&focus=<reminder_id>`. The route picks `sendToUser(assignee_id, …)` when an assignee is set, else `sendToHousehold(household_id, …)`. Inline `delivery_detail` writeback records `sent=N expired=N failed=N` so a 200 OK with zero deliveries is visible (the M16 lesson — surface the payload, not just the status).

**V2 UI primitives that land with M17.**

- **`/plan` route** with a segmented control (Reminders | Tasks). Both segments are live as of M18; the control itself is the design-system §7.16 primitive.
- **BottomNav refactor** — `List | Plan | History | Avatar`. Avatar chip (§7.19) opens a Sheet with Household / Settings / Notifications (anchor) / Sign out. Existing routes (`/household`, `/settings`) keep working; only the entry point moved.
- **`RemindersRealtime`** provider mounted in `AppShell` — fetches on mount, subscribes to the `reminders` channel filtered by `household_id`, re-fetches on `SUBSCRIBED` + `online` (the M16 reconnect lesson).
- **`useReminders` hook** — online-only CRUD. When `recurrence` changes without an explicit `nextFireAt`, the hook calls `nextFire(rrule, now(), tz)` so the new rule fires at its next valid future occurrence.

---

## 18. Household Tasks (M18)

Assignable, due-dated chores. Same household-scoped + member-CRUD + realtime shape as M17 reminders, minus the scheduler — a task is "done when someone marks it done", not "fires at time T". Recurring tasks are deliberately deferred to V2.1 (`docs/plan.md` §M18) — a truly scheduled chore fits the reminder primitive better.

**Schema lives in `tasks`** with completion-state fields paired by a CHECK constraint (`is_completed=true ⇒ completed_at NOT NULL`). All three user references (`assignee_id`, `completed_by`, `created_by`) use `ON DELETE SET NULL` so a row survives the assignee, completer, or creator leaving — the UI shows "Unassigned"/"Former member" via the M3.5 snapshot pattern. Three partial indexes cover the hot read paths: open-by-due, completed-by-completed-at, and open-by-assignee (the BottomNav badge).

**`useTasks` hook** does the full optimistic + offline-queueable CRUD: `createTask`, `updateTask`, `completeTask`, `uncompleteTask`, `deleteTask`. Mirror of `useList`'s queueing pattern — unlike M17 reminders (deliberately online-only), tasks support offline writes because checking off a chore on the bus shouldn't require waiting for sync.

**Offline queue extension.** `QueuedOp` (in `src/lib/offline/queue.ts`) gained three new variants: `task_create | task_update | task_delete`. The existing `useList` drain loop (mutex-guarded, fired on `online` + `SUBSCRIBED` + visibility change) drains them in FIFO order with the rest. New helper in `src/lib/push/client.ts` — `notifyTaskAssignment(taskId)` — fires the assignment push fire-and-forget; both the online write path (`useTasks`) and the offline drain path (`executor.ts`'s `task_create`/`task_update` arms) call it. The assignment push itself is **not** queued — once the DB write lands, the push is a single best-effort HTTP call.

**Assignment-push delivery (`/api/push/task-assigned`, M18 D1=A).** Node-runtime route. The client POSTs `{ task_id }`. The route:

1. Verifies the caller via the user's JWT (`createClient` from `src/lib/supabase/server.ts`).
2. SELECTs the task through the user's RLS view — non-members get `null` → 404.
3. Resolves the actor's `display_name` from `household_members` via the admin client.
4. Calls `sendToUser(task.assignee_id, { kind: 'task', target_id, household_id, title, body: '<actor> assigned: <title>' })`.

Returns `{ ok, sent, expired, failed }` per the M16 "surface the payload, not just status" lesson. Unassigned tasks short-circuit with `{ skipped: true, sent: 0 }`. Push payload reuses the M16 contract (`PushKind` already includes `'task'`); the SW maps `kind:'task'` → `/plan?tab=tasks&focus=<task_id>`.

**Plan→Tasks UI.** `src/components/plan/PlanTasksView.tsx` replaces the M17 placeholder. Owns: filter chips, list grouping (`Open` sorted by `due_date asc nulls last, created_at asc`; `Completed` collapsed and capped at 30 days at fetch time), empty state, FAB, edit-sheet open/close, `?focus=<id>` deep-link handling. `FilterChipRow` (design-system §7.17) is the new shared primitive — single-select radiogroup with optional count badges, horizontal scroll, hidden scrollbar, roving tabindex.

**BottomNav badge.** Plan tab gets a count pill = open tasks where `assignee_id === currentUserId`. Capped at `9+`. Derived from the same `useTaskStore` PlanTasksView reads, so it stays in lockstep with optimistic completions and realtime edits.

**30-day completed cutoff (M18 D8).** `TasksRealtime` fetches open tasks unconditionally + completed tasks where `completed_at >= now() - interval '30 days'`. Older completions are dropped from the cache, not just hidden, keeping the store bounded on long-lived households. A row that re-opens via realtime UPDATE always comes back into view.

**Notification settings.** No per-type toggle in M18 (D3=B). The Settings → Notifications enable/disable still governs both reminders and tasks globally. If users complain post-launch, add a `notification_preferences` table in V2.1 — pre-building it now is premature.

---

## 19. PWA Configuration

```typescript
// next.config.ts — withPWA wrapper
// public/manifest.json — name, icons, theme_color: '#3D8055', display: 'standalone'
// Service worker caches: app shell, fonts, icons
// Do NOT cache API responses (Supabase) — always network-first for data
```

Safe area handling — always in layout components:

```css
padding-top: env(safe-area-inset-top);
padding-bottom: calc(56px + env(safe-area-inset-bottom));
```

Keyboard handling — in `AddItemBar.tsx` using Visual Viewport API:

```typescript
window.visualViewport?.addEventListener('resize', adjustForKeyboard)
```

---

## 20. Accessibility Requirements

Every component must meet these standards before it is considered done:

- All interactive elements: `min-h-[44px] min-w-[44px]` tap target
- All icon-only buttons: `aria-label` describing the action
- Checkboxes: `role="checkbox"` + `aria-checked`
- Live updates (Realtime): `aria-live="polite"` on the list container
- Error messages: `role="alert"`, associated with input via `aria-describedby`
- Focus ring: never `outline-none` without a visible replacement
- Colour contrast: 4.5:1 minimum for body text, 3:1 for large text and UI components
- Animations: all transitions wrapped in `@media (prefers-reduced-motion: reduce)` override

Run Lighthouse accessibility audit before marking any milestone done. Target: ≥ 90.

---

## 21. Code Quality Gates

Run these before every commit. Never commit if any fail:

```bash
npm run type-check   # Zero TypeScript errors
npm run lint         # Zero ESLint errors (warnings acceptable)
npm run format       # Prettier applied
```

The CI pipeline (GitHub Actions) runs these on every PR and blocks merge on failure.

---

## 22. What Is Out of Scope for V1

Do not build, plan, or scaffold these until they appear in an active milestone:

- Push notifications
- Smart / suggested items
- Email or Google Sign-In (auth upgrade is V1.1)
- Quantity or notes on items (V1.1)
- Meal planner
- Native mobile app (React Native / Expo)
- Monetisation, ads, subscriptions
- Analytics (PostHog)
- Admin dashboard

If asked to build any of these during V1, decline and note it's a future milestone.

---

## 23. Absolute Rules — Never Break These

```
❌ Never use the Next.js Pages Router — App Router only
❌ Never use TypeScript `any`
❌ Never hardcode hex colour values in component files
❌ Never call Supabase directly inside component JSX or event handlers
❌ Never commit .env.local or any file containing API keys
❌ Never use localStorage for list data — Zustand + IndexedDB only
❌ Never add a new npm package without checking if existing packages cover the need
❌ Never write a migration that drops a column without an explicit instruction to do so
❌ Never disable ESLint rules inline without a comment explaining why
❌ Never skip the accessibility requirements — they are not optional
```

---

## 24. Asking for Help

If something in this file conflicts with something in `docs/plan.md` or
`docs/design_document_guidelines.md`, the more specific document wins.
If genuinely ambiguous, ask before proceeding — do not guess.

If a task requires a decision not covered by any doc, state the options and
tradeoffs clearly before making a choice.

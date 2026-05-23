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
ACTIVE: none — M11 shipped; M12 (Shopping History) up next
```

Update this line when starting a new milestone. V1 milestone definitions are in `docs/plan.md` Section 11; V1.1 in Section 11.5.

| #                             | Milestone                             | Status     |
| ----------------------------- | ------------------------------------- | ---------- |
| M0                            | Scaffold & Infrastructure             | ✅ Done    |
| M1                            | Guest Auth & Session Persistence      | ✅ Done    |
| M2                            | Household Create & Join               | ✅ Done    |
| M3                            | Shopping List Core (CRUD)             | ✅ Done    |
| M3.5                          | Testing & Feedback                    | ✅ Done    |
| M4                            | Real-Time Sync                        | ✅ Done    |
| M5                            | Offline Support                       | ✅ Done    |
| M6                            | PWA Polish & Install                  | ✅ Done    |
| M7                            | QA, Edge Cases & Launch               | ✅ Done    |
| **V1.1 — Continuity & Trust** |                                       |            |
| M8                            | Item Quantity & Notes                 | ✅ Done    |
| M9                            | Full Account Upgrade (Email)          | ✅ Done    |
| M10                           | Multiple Lists per Household          | ✅ Done    |
| M11                           | Recurring / Staple Items + Trip Model | ✅ Done    |
| M12                           | Shopping History                      | ⏳ Planned |
| M13                           | Sentry & Observability                | ⏳ Planned |
| M14                           | QA, Edge Cases & V1.1 Launch          | ⏳ Planned |

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
| Monitoring | _(deferred to end of V1.1)_         | Sentry will be wired in once V1.1 stabilises                                    |
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
│   │   │   ├── household/page.tsx    # Household management
│   │   │   └── settings/page.tsx     # User settings
│   │   ├── api/                      # API route handlers
│   │   ├── layout.tsx                # Root layout (fonts, providers)
│   │   ├── page.tsx                  # Root redirect (→ /welcome or /list)
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
│   │   ├── household/
│   │   │   ├── InviteCode.tsx        # Invite code display + share
│   │   │   └── MemberList.tsx
│   │   └── layout/
│   │       ├── AppShell.tsx          # Main app wrapper
│   │       ├── Header.tsx            # Top bar with household name
│   │       └── BottomNav.tsx         # Tab navigation
│   │
│   ├── hooks/
│   │   ├── useSession.ts             # Auth session state
│   │   ├── useHousehold.ts           # Current household + members
│   │   ├── useList.ts                # List items + Realtime subscription
│   │   ├── useOfflineQueue.ts        # IndexedDB write queue
│   │   └── useNetworkStatus.ts       # Online/offline detection
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client (singleton)
│   │   │   └── server.ts             # Server component Supabase client
│   │   ├── categories.ts             # Item name → category keyword dictionary
│   │   ├── database.types.ts         # Generated Supabase TypeScript types
│   │   └── utils.ts                  # General helpers (cn, formatDate, etc.)
│   │
│   ├── store/
│   │   ├── userStore.ts              # userId, isAnonymous, displayName
│   │   ├── householdStore.ts         # householdId, name, members
│   │   └── listStore.ts              # items, optimistic updates
│   │
│   └── proxy.ts                      # Auth proxy (Next.js 16) — protects (app) routes
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
```

> Sentry env vars (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) will be added at the end of V1.1 when Sentry is wired in. Not used in V1.

Never commit `.env.local`. Never hardcode these values in any file.

---

## 7. Database Schema

Six tables, all with Row Level Security (RLS) enabled.

```sql
households
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  name          text NOT NULL
  invite_code   text UNIQUE NOT NULL    -- 6-char alphanumeric, expires after 7 days (M3.5 F4); owners can regenerate at any time
  code_expires_at timestamptz NOT NULL
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
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  list_id         uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE
  added_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL
  added_by_name   text                                        -- M3.5 snapshot for former members
  name            text NOT NULL
  quantity        text                                        -- legacy free-text, pre-M8 fallback
  quantity_value  numeric(6,2)                                -- M8 canonical
  quantity_unit   text                                        -- M8 canonical: g|kg|mL|L|piece|can|dozen
  category        text NOT NULL DEFAULT 'Other'
  is_checked      boolean NOT NULL DEFAULT false
  is_recurring    boolean NOT NULL DEFAULT false              -- M11 staple flag
  checked_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL
  checked_at      timestamptz
  note            text
  sort_order      integer NOT NULL DEFAULT 0
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

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
```

**RLS rules (enforce in every migration):**

- Users can only SELECT/INSERT/UPDATE/DELETE `list_items` in lists belonging to their household
- Users can only SELECT/INSERT `household_members` for their own household
- `shopping_trips` and `shopping_trip_items` are SELECT-only for household members; writes happen via the `finish_shopping(p_list_id)` SECURITY DEFINER RPC
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

## 15. Category Auto-Detection

`src/lib/categories.ts` exports a dictionary and a `detectCategory(itemName: string): string` function.

```typescript
// Pattern — keyword matching, case-insensitive
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Produce': ['apple', 'banana', 'lettuce', 'tomato', 'onion', 'garlic', ...],
  'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', ...],
  'Meat': ['chicken', 'beef', 'pork', 'lamb', 'mince', 'steak', 'sausage', ...],
  'Bakery': ['bread', 'rolls', 'croissant', 'sourdough', ...],
  'Pantry': ['rice', 'pasta', 'flour', 'sugar', 'oil', 'tinned', 'canned', ...],
  'Frozen': ['frozen', 'ice cream', 'chips', ...],
  'Beverages': ['juice', 'coffee', 'tea', 'water', 'soft drink', 'beer', 'wine', ...],
  'Household': ['toilet paper', 'detergent', 'dishwashing', 'bin bags', ...],
  'Personal Care': ['shampoo', 'conditioner', 'toothpaste', 'deodorant', ...],
}
// Default fallback: 'Other'
```

This runs client-side — no network call. Fast, works offline.

---

## 16. PWA Configuration

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

## 17. Accessibility Requirements

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

## 18. Code Quality Gates

Run these before every commit. Never commit if any fail:

```bash
npm run type-check   # Zero TypeScript errors
npm run lint         # Zero ESLint errors (warnings acceptable)
npm run format       # Prettier applied
```

The CI pipeline (GitHub Actions) runs these on every PR and blocks merge on failure.

---

## 19. What Is Out of Scope for V1

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

## 20. Absolute Rules — Never Break These

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

## 21. Asking for Help

If something in this file conflicts with something in `docs/plan.md` or
`docs/design_document_guidelines.md`, the more specific document wins.
If genuinely ambiguous, ask before proceeding — do not guess.

If a task requires a decision not covered by any doc, state the options and
tradeoffs clearly before making a choice.

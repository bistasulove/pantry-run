# 🎨 Household Planner App — Design & UI/UX Guidelines

### Master Design Document · V1 PWA

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Competitive Analysis](#2-competitive-analysis)
3. [Brand Identity](#3-brand-identity)
4. [Color System](#4-color-system)
5. [Typography](#5-typography)
6. [Spacing, Grid & Layout](#6-spacing-grid--layout)
7. [Component Library](#7-component-library)
8. [Iconography](#8-iconography)
9. [Screen-by-Screen UX Flows](#9-screen-by-screen-ux-flows)
10. [Micro-interactions & Animation](#10-micro-interactions--animation)
11. [Dark Mode](#11-dark-mode)
12. [Accessibility Standards](#12-accessibility-standards)
13. [PWA-Specific Design Considerations](#13-pwa-specific-design-considerations)
14. [Responsive Breakpoints](#14-responsive-breakpoints)
15. [Design Do's and Don'ts](#15-design-dos-and-donts)
16. [Design Tokens Reference](#16-design-tokens-reference)

---

## 1. Design Philosophy

### 1.1 Core Principle: Invisible Design

The best interface for a grocery app is the one you stop noticing. A shopper standing in the dairy aisle, phone in one hand and a carton of oat milk in the other, needs to check off an item in under two seconds. Every design decision is evaluated against this scenario.

> **The golden rule:** Every tap, every second of confusion, every misread label is a UX failure. Speed and legibility are the primary aesthetic.

### 1.2 The Three Design Values

**1. Frictionless**
Remove every unnecessary step. No confirmation dialogs for adding items. No multi-step flows where one step will do. Optimistic updates everywhere — the UI responds immediately, backend catches up silently.

**2. Warm and Human**
This is a personal, household app — not enterprise software. The design should feel like something you'd show your partner with pride, not something that came pre-installed. Soft tones, rounded shapes, gentle animations. It should feel like a well-designed notebook, not a spreadsheet.

**3. Confidence Under Chaos**
Users open this app in loud supermarkets, on bright sunlit days, with a trolley in one hand. Typography must be legible at arm's length. Touch targets must be impossible to miss. Contrast must survive harsh light. The design does not fail in the real world.

### 1.3 Design Personality

If this app were a person: calm, organised, warm, quietly clever. Not loud or flashy. Not corporate. The visual language should feel like a premium stationery brand — considered, clean, with just enough personality to be memorable.

References to draw from (not copy):

- **Things 3** — masterful use of whitespace and hierarchy in a to-do app
- **Notion** — clean, neutral, infinitely usable
- **Linear** — precise spacing, sharp typography, no decoration that doesn't serve a purpose
- **Headspace** — warm color palette, rounded shapes, human-first emotional tone
- **AnyList** — functional simplicity done well (but visually dated — we do what it does, better)

---

## 2. Competitive Analysis

### 2.1 What Major Apps Do Well

| App          | What to Learn                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| **AnyList**  | Aisle-based category grouping is genuinely useful for shopping. Fast item entry UX.                  |
| **Todoist**  | Clean list hierarchy. Color-coded labels don't overwhelm. Natural text entry.                        |
| **Any.do**   | Onboarding flow is smooth. Sharing is prominent, not buried.                                         |
| **Notion**   | Whitespace usage. Typography scale creates clear hierarchy without bold everywhere.                  |
| **Things 3** | Check-off animation is satisfying without being distracting. The interaction itself feels rewarding. |
| **Linear**   | Keyboard shortcuts. Fast interactions. Design so clean it builds trust.                              |
| **Cozi**     | Household-specific mental model (lists, calendar, tasks in one place) — validates our V3 roadmap.    |

### 2.2 What Major Apps Do Poorly

| App                | What to Avoid                                                                   |
| ------------------ | ------------------------------------------------------------------------------- |
| **AnyList**        | Visually dated. iOS-only aesthetic. Poor Android experience.                    |
| **OurGroceries**   | Cluttered UI. Dense information without enough breathing room.                  |
| **Google Keep**    | Generic. No household-specific features. Colour-coding feels arbitrary.         |
| **Cozi**           | Overloaded with features. Onboarding is overwhelming. No clear visual identity. |
| **Todoist (free)** | Paywall friction on features users expect free. Aggressive upsell.              |

### 2.3 Design Gap We're Filling

No existing app combines:

- Mobile-first real-time collaboration
- A design quality comparable to premium productivity apps
- Household-specific mental model (not generic task management)
- Instant join with zero signup friction

Our design can and should be the most visually polished app in this category.

---

## 3. Brand Identity

### 3.1 App Name Placeholder

This document uses **[App Name]** as a placeholder. When a name is chosen, apply it consistently throughout. The name should be short (1–2 syllables), warm in sound, and not literal (avoid names like "GroceryPal" or "ListShare").

Suggested names to consider: Hearthly, Pantri, Listly, Homie, Rallyst, Nestly.

### 3.2 Logo Concept

**Concept direction:** A simple, rounded mark — either an abstract checkmark that doubles as a household/roof silhouette, or a stylised pair of overlapping circles (representing two people sharing). The logo should work at 16×16px (browser favicon) and at 512×512px (PWA splash screen) with equal clarity.

**Logo rules:**

- Never stretch, rotate, or recolour outside the defined palette
- Maintain minimum 8px clear space on all sides
- Monochrome version must work on both light and dark backgrounds
- The icon alone (without wordmark) must be recognisable at small sizes

### 3.3 Brand Voice

| In the app     | Tone                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------- |
| Empty state    | Warm, encouraging. "Your list is empty — add something to get started." NOT "No items found." |
| Error messages | Honest and calm. "Couldn't save. Tap to retry." NOT "Error 500: Server failure."              |
| Success states | Brief and satisfying. "Done! List cleared." NOT "Operation completed successfully."           |
| Invite prompts | Personal. "Share with your household." NOT "Invite collaborators."                            |
| Onboarding     | Conversational. "What should we call your household?" NOT "Enter household name:"             |

---

## 4. Color System

### 4.1 Design Rationale

The palette is anchored in **warm sage and off-white** — colours associated with fresh produce, home, and calm. We deliberately avoid the cold blue/purple tones common in productivity software. The goal is an app that feels domestic and welcoming, not corporate.

Accent colours are used sparingly — only for primary actions, status indicators, and category labels. The dominant 90% of the UI should be neutral.

### 4.2 Light Mode Palette

```
── Backgrounds ──────────────────────────────────────────
Background Base      #F7F6F3    Warm off-white. Main app background.
Background Surface   #FFFFFF    Cards, list containers, input fields.
Background Elevated  #F0EEE9    Slightly darker for modals, bottom sheets.
Background Muted     #ECEAE4    Subtle dividers, skeleton loaders.

── Text ─────────────────────────────────────────────────
Text Primary         #1C1C1A    Near-black with warm undertone. Main text.
Text Secondary       #6B6860    Mid-grey. Metadata, labels, timestamps.
Text Placeholder     #AEABA3    Input placeholders, hints.
Text Disabled        #C8C5BD    Disabled states.
Text Inverse         #FFFFFF    Text on dark/coloured backgrounds.

── Brand / Primary ──────────────────────────────────────
Primary 50           #EDF4EF    Lightest tint. Hover backgrounds.
Primary 100          #D5E8DB    Light tint. Selected row backgrounds.
Primary 200          #A8CFAF    —
Primary 300          #78B384    —
Primary 400          #52996A    —
Primary 500          #3D8055    Main brand colour. Primary buttons, accents.
Primary 600          #2F6642    Hover state for primary buttons.
Primary 700          #214D31    Pressed/active state.

── Semantic ─────────────────────────────────────────────
Success              #3D8055    (= Primary 500) Item added, sync complete.
Warning              #B97C2E    Offline banner, expiry warnings.
Error                #C0392B    Destructive actions, delete confirmations.
Info                 #2E6BA8    Informational toasts (not used heavily).

── Category Labels (subtle, tinted) ─────────────────────
Produce              #6B9E60    Soft green
Dairy                #5B8EB8    Soft blue
Meat & Seafood       #C26B5A    Soft terracotta
Pantry               #B89A56    Soft amber
Bakery               #C2895A    Soft orange
Frozen               #7B9EB8    Muted steel blue
Beverages            #8B6BAE    Soft purple
Household            #8A8A8A    Neutral grey
Personal Care        #B8607A    Soft rose
Other                #9B9287    Warm grey

── Borders & Dividers ───────────────────────────────────
Border Default       #E4E2DC    Subtle. Cards, inputs.
Border Focused       #3D8055    Primary green. Focused input ring.
Border Destructive   #C0392B    Delete confirmation borders.

── Special ──────────────────────────────────────────────
Checked Item Text    #AEABA3    Greyed out, struck through.
Checked Item BG      #F7F6F3    Same as background (no separate colour).
Overlay              rgba(28,28,26,0.4)   Modal backdrops.
Shadow               rgba(28,28,26,0.08)  Card shadows.
```

### 4.3 Dark Mode Palette

```
── Backgrounds ──────────────────────────────────────────
Background Base      #18181A    Near-black, very slightly warm.
Background Surface   #242426    Cards, inputs.
Background Elevated  #2E2E31    Modals, bottom sheets.
Background Muted     #38383C    Dividers, skeleton loaders.

── Text ─────────────────────────────────────────────────
Text Primary         #F0EFEC    Warm white. Main text.
Text Secondary       #9E9A92    Mid-grey.
Text Placeholder     #5C5A55    Hints, placeholders.
Text Disabled        #46443F    Disabled.
Text Inverse         #1C1C1A    Text on light elements.

── Brand / Primary (same hue, adjusted for dark) ────────
Primary 500          #5A9E70    Slightly lighter in dark mode for contrast.
Primary 600          #4A8460    Hover state.

── Semantic (same, slightly brighter for dark mode) ─────
Success              #5A9E70
Warning              #D4944A
Error                #D95C50
```

### 4.4 Colour Usage Rules

- **Primary 500** is used for interactive elements only — primary buttons, focus rings, checkboxes, links. Never for decorative purposes.
- **Never use more than two category colours on the same screen.** Category chips are small; visual noise compounds quickly.
- **Checked items** are de-emphasised with `Text Placeholder` colour + line-through. They should recede visually, not disappear entirely (users still need to verify what's in their cart).
- **Error red** is reserved strictly for destructive actions. Do not use it for validation of non-critical fields.
- All colour combinations must meet **WCAG AA contrast ratios** (4.5:1 for normal text, 3:1 for large text and UI components). Test every combination.

---

## 5. Typography

### 5.1 Font Selection

**Display & Headings: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)**

- Geometric sans-serif with a slightly warm, contemporary feel
- Excellent readability at both large and small sizes
- Distinctive enough to build brand recognition without being trendy
- Free on Google Fonts; no licensing cost

**Body & UI: [DM Sans](https://fonts.google.com/specimen/DM+Sans)**

- Low-contrast, clean, highly legible at small sizes
- Optical sizing makes it exceptional for UI labels and list items
- Pairs naturally with Plus Jakarta Sans (both geometric, harmonious)
- Free on Google Fonts

**Monospace (for invite codes, household IDs): [DM Mono](https://fonts.google.com/specimen/DM+Mono)**

- Consistent with the DM family
- Used only for 6-character invite codes to improve legibility

### 5.2 Type Scale

```
Token           Size    Line-height   Weight    Usage
─────────────────────────────────────────────────────────
display-lg      32px    1.2           700       Page titles (rare)
display-sm      24px    1.25          700       Section headers, empty state titles
heading-lg      20px    1.3           600       Card titles, modal headers
heading-sm      17px    1.35          600       List section headers (Produce, Dairy…)
body-lg         16px    1.5           400       Primary item text (item name)
body-sm         14px    1.5           400       Secondary item text (quantity, notes)
label           13px    1.4           500       Button labels, input labels, chips
caption         12px    1.4           400       Timestamps, "added by" metadata
code            14px    1.4           400       Invite codes (DM Mono)
```

### 5.3 Typography Rules

- **Item names** (the core content) are always `body-lg` (16px), weight 400. Never reduce below this for list items.
- **Line-height 1.5** on all body text ensures readability on mobile without items feeling cramped.
- **Checked/completed items** use `body-lg` + `Text Placeholder` colour + CSS `text-decoration: line-through`. Do not reduce font size — users need to read checked items to confirm what's in their cart.
- **Heading hierarchy** is enforced via size and weight, not bold alone. Never use `font-weight: 700` on body text for emphasis — use a secondary colour or label chip instead.
- **Letter-spacing:** 0 for body and headings. `0.04em` for all-caps labels only (e.g., category headers like "PRODUCE").
- **Font loading:** Load both fonts via `<link rel="preload">`. Use `font-display: swap` to prevent invisible text during load. Define a system font fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

### 5.4 Fluid Typography (PWA)

Use CSS `clamp()` for the two display sizes to scale smoothly across device widths:

```css
--text-display-lg: clamp(24px, 5vw, 32px);
--text-display-sm: clamp(20px, 4vw, 24px);
```

All other sizes are fixed — don't scale them. Mobile first means 16px is already optimised.

---

## 6. Spacing, Grid & Layout

### 6.1 Spacing Scale (4px Base)

```
Token    Value    Common Usage
───────────────────────────────────────────────
space-1    4px    Icon-to-label gaps, chip internal padding
space-2    8px    Inline element gaps (quantity badge to text)
space-3   12px    Button internal vertical padding
space-4   16px    Default horizontal page margin, card internal padding
space-5   20px    Vertical gap between list sections
space-6   24px    Between major UI sections
space-8   32px    Empty state vertical spacing
space-10  40px    Large sections, modal padding
space-12  48px    Bottom safe area padding (above nav bar)
```

### 6.2 Page Layout

**Mobile (default — 320px to 480px):**

```
┌─────────────────────────────┐
│  Status bar (system)        │
├─────────────────────────────┤
│  App header (56px)          │  ← Household name + sync indicator
├─────────────────────────────┤
│                             │
│  Scrollable content         │  ← 16px horizontal padding
│                             │
│                             │
├─────────────────────────────┤
│  Floating add item bar      │  ← 64px tall, above nav
├─────────────────────────────┤
│  Bottom nav (56px)          │
│  Bottom safe area (system)  │
└─────────────────────────────┘
```

**Tablet / Large phone (481px+):**

- Max content width: 560px
- Content centred horizontally
- Bottom nav becomes a sidebar on landscape orientation (768px+)

### 6.3 Safe Areas

Always respect device safe areas using CSS env() variables:

```css
padding-bottom: calc(56px + env(safe-area-inset-bottom));
padding-top: env(safe-area-inset-top);
```

This ensures the nav bar and header are never obscured by the iPhone notch, Dynamic Island, or Android gesture bar.

### 6.4 Grid & Alignment

- **Single-column layout** throughout the app. No multi-column grids on the list screen — a single, wide, scannable list is faster to use while shopping.
- All content aligns to a **16px horizontal gutter**.
- List items use a consistent **72px minimum row height** to accommodate one line of text + metadata without feeling cramped.
- Section headers (category labels) are **40px tall** — visually lighter than list items.
- Bottom navigation is **56px tall** plus safe area inset.

---

## 7. Component Library

### 7.1 List Item (Core Component)

The single most important component in the app. Must be instantly tappable and scannable.

```
┌───────────────────────────────────────────────────┐
│  ○   Whole milk                          Dairy  › │  ← Unchecked
│      2L · added by Sarah                          │
└───────────────────────────────────────────────────┘
```

```
┌───────────────────────────────────────────────────┐
│  ✓   ~~Whole milk~~                      Dairy    │  ← Checked
│      2L · added by Sarah                          │
└───────────────────────────────────────────────────┘
```

**Anatomy:**

- **Checkbox zone (left, 48px wide):** The tap target for checking/unchecking. Circle checkbox animates to filled checkmark.
- **Item name (flex-grow):** `body-lg`, Primary text colour. Struck through and greyed when checked.
- **Category chip (right, optional):** Small pill badge, category background colour at 15% opacity, category text colour. Only shown on items without an explicit section header visible.
- **Metadata row:** `caption` size, Secondary text colour. Shows quantity and "added by [name]" when household has >1 member.
- **Swipe right:** Reveal edit action.
- **Swipe left:** Reveal delete action (red, trash icon).
- **Long press:** Enter multi-select mode.

**States:**

- Default, Hover (desktop), Pressed (scale 0.98), Checked, Editing, Deleting.

**Minimum row height:** 72px (ensures touch target compliance).

### 7.2 Add Item Input Bar

Fixed to the bottom of the screen, above the navigation bar.

```
┌─────────────────────────────────────────────────────┐
│  🔍  Add an item...                            [+]  │
└─────────────────────────────────────────────────────┘
```

- **Height:** 56px + safe area inset
- **Background:** Surface white with a top border + subtle drop shadow
- **Input field:** Full-width tap target. Tapping opens keyboard and focuses the input.
- **[+] button:** 44×44px. Primary 500 colour. Submits on tap or Enter key.
- **Behaviour:** Typing starts smart category detection. A category suggestion chip appears below the input: "Adding to Produce ›". Tapping the chip toggles through categories.
- **After submission:** Input clears immediately (optimistic). Item slides in from the bottom of its category group. Keyboard stays open for rapid multi-item entry.
- **Dismiss:** Tapping outside the input or pressing escape dismisses keyboard. The bar collapses to its minimal state.

### 7.3 Category Section Header

```
PRODUCE                                            4 items
──────────────────────────────────────────────────────────
```

- **Height:** 40px
- **Text:** `label` size, all-caps, `letter-spacing: 0.04em`, Secondary text colour
- **Item count:** Right-aligned, `caption`, Secondary text colour
- **Divider line:** 1px, Border Default colour
- **Tap to collapse:** Section folds with a smooth 200ms ease animation. Arrow icon rotates 180°.

### 7.4 Primary Button

```
┌──────────────────────────────────┐
│         Create Household         │
└──────────────────────────────────┘
```

- **Height:** 52px
- **Width:** Full-width in mobile contexts; auto with min-width 180px in desktop
- **Radius:** 14px (rounded, not pill-shaped)
- **Background:** Primary 500 (`#3D8055`)
- **Text:** `label` size, weight 600, Text Inverse (`#FFFFFF`)
- **Hover:** Primary 600 background, subtle scale 1.01
- **Press:** Primary 700 background, scale 0.98
- **Disabled:** Background Muted, Text Disabled

### 7.5 Secondary Button

Same dimensions as primary, but:

- **Background:** Transparent
- **Border:** 1.5px solid Border Default
- **Text:** Primary 500 colour
- **Hover:** Primary 50 background

### 7.6 Destructive Button

Same dimensions, but:

- **Background:** Transparent (or Error on final confirm)
- **Text:** Error colour (`#C0392B`)
- Used only for delete confirmation — never as a first-click action.

### 7.7 Icon Button

- **Size:** 44×44px tap target (icon visually 20–24px, padded to 44px)
- **Background:** Transparent default; Background Muted on hover
- **Radius:** 10px
- Used for: settings, share, collapse, kebab menu (three dots)

### 7.8 Text Input

```
┌─────────────────────────────────────────────┐
│  Household name                             │
└─────────────────────────────────────────────┘
```

- **Height:** 52px
- **Padding:** 0 16px
- **Radius:** 12px
- **Border:** 1.5px solid Border Default
- **Focus:** Border Primary 500, subtle box shadow `0 0 0 3px Primary 50`
- **Error:** Border Error, error message below in Error colour, `caption` size
- **Font:** `body-lg`, Primary text

### 7.9 Invite Code Display

```
┌─────────────────────────────────────────────┐
│                                             │
│             HH - 4 8 2 9                   │  ← DM Mono, large
│                                             │
│         Tap to copy  ·  Share →            │
└─────────────────────────────────────────────┘
```

- **Code font:** DM Mono, `display-sm` (24px), weight 600, Primary 500
- **Background:** Primary 50
- **Border:** 1.5px dashed Border Default
- **Radius:** 16px
- **"Tap to copy":** Tapping the entire card copies code to clipboard, shows brief "Copied!" toast
- **"Share →":** Opens native share sheet (Web Share API)

### 7.10 Toast / Snackbar Notification

```
┌──────────────────────────────────────────────────────┐
│  ✓  Sarah added "Oat milk"                     ✕    │
└──────────────────────────────────────────────────────┘
```

- **Position:** Bottom of screen, above nav bar (8px gap)
- **Width:** Screen width minus 32px (16px sides)
- **Height:** Auto (min 48px)
- **Background:** Text Primary (`#1C1C1A`) with 95% opacity — not pure black
- **Text:** Text Inverse, `body-sm`
- **Radius:** 12px
- **Animation:** Slides up from below, fades out after 3 seconds
- **Max stacked:** 2 toasts visible at once; oldest dismissed first
- **Dismiss:** Tap anywhere on toast

### 7.11 Bottom Sheet / Modal

Used for item editing, settings, member management.

- **Background:** Background Elevated
- **Handle bar:** 4×36px, Background Muted, centred, 8px from top
- **Corner radius:** 20px top corners only
- **Backdrop:** Overlay (rgba 0.4) — tapping dismisses
- **Animation:** Slides up from bottom, 280ms ease-out
- **Drag to dismiss:** Dragging down past 40% of sheet height triggers dismiss

### 7.12 Empty State

```
        [ Illustration ]

    Your list is empty

  Add the first item below ↓
```

- **Illustration:** Simple, line-art style. A shopping bag or a clean checkmark circle. Not photographic, not overly detailed. Uses Primary 200 colour only.
- **Title:** `display-sm`, Primary text
- **Subtitle:** `body-lg`, Secondary text
- **Position:** Centred vertically in the available space above the add bar

### 7.13 Online/Offline Status Banner

```
┌─────────────────────────────────────────────────────┐
│  ○  Offline — changes will sync when reconnected    │
└─────────────────────────────────────────────────────┘
```

- **Height:** 36px
- **Background:** Warning (`#B97C2E`) at 15% opacity; Warning border bottom 1px
- **Text:** `label`, Warning colour
- **Position:** Directly below the app header
- **Animation:** Slides down smoothly; no jarring reflow of list content
- **Dismissal:** Auto-dismisses 2 seconds after reconnecting

### 7.14 Collaborator Presence Indicator

When another household member is actively viewing the list:

```
●  Sarah is here
```

- Small dot, 8px, Primary 500 colour, pulsing animation (1.5s, subtle)
- `caption` text, Secondary colour
- Shown in the app header right side, next to the household name
- Disappears when they go inactive (30s timeout)

### 7.15 Skeleton Loaders

Used while the list loads on first open or reconnect. Never show a spinner — skeleton loaders are less anxious and more informative.

- Match the exact layout of real list items (checkbox zone + two lines of text)
- Background: `linear-gradient` shimmer from Background Muted to Background Base
- Animation: 1.5s shimmer sweep, loops until content loads
- Show 5–6 skeleton items to fill the screen

### 7.16 Segmented Control _(V2 stub)_

Two-way (or N-way) switch used inside `/plan` to toggle between Reminders and Tasks views.

```
┌──────────────────────────┐
│  Reminders  │   Tasks    │
└──────────────────────────┘
```

- **Owning milestone:** M17 (first V2 milestone to add a tab)
- **Used by:** M17 (Reminders / Tasks split inside `/plan`), M18, future
- **Locked basics:** sits below Header, above the active view content. Active segment uses Primary accent text; inactive uses Text Secondary. Underline indicator slides between segments (250ms `ease-out-expo`). Full segment tap target meets 44px minimum.
- **Spec at M17 kickoff:** exact heights, border treatment, dark-mode variant, reduced-motion fallback.

### 7.17 Filter Chip _(V2 stub)_

Horizontally-scrolling row of single-select pills used inside `/tasks` to filter views.

```
[ All ]  [ Mine ]  [ Unassigned ]  [ Overdue ]
```

- **Owning milestone:** M18
- **Used by:** M18, future (history filters, activity filters)
- **Locked basics:** single-select within row. Active chip uses Primary accent background + Text Inverse; inactive uses Background Surface + Text Secondary + 1px border. 32px tall, 12px horizontal padding, 8px gap between chips. Touch target inflated to 44px via invisible padding.
- **Spec at M18 kickoff:** scroll behaviour at narrow widths, optional count badge (e.g. "Overdue · 3"), dark-mode variant.

### 7.18 Header Bell + Badge _(V2 stub)_

Notification entry point on the Header right side. Tap opens the Activity sheet.

```
🔔 (3)
```

- **Owning milestone:** M19
- **Used by:** M19 (Activity unseen-count)
- **Locked basics:** Lucide `Bell` icon, `size={20}`, `strokeWidth={1.5}`. Badge is a small filled pill, top-right of the icon, Primary accent background + Text Inverse, `caption` size. Count caps at "9+". `aria-label="Activity (N unseen)"`. Tap target meets 44px minimum.
- **Spec at M19 kickoff:** badge animation on increment, dark-mode variant, no-unseen state (badge hidden vs. greyed).

### 7.19 Avatar Menu Chip _(V2 stub)_

Identity chip on the Header right side. Tap opens the More sheet (Household, Settings, Notifications, Sign out).

```
( SR )
```

- **Owning milestone:** M17 (BottomNav refactor lands with M17 as the first V2 tab change)
- **Used by:** all V2 navigation
- **Locked basics:** circular chip, 36px diameter, household-derived initials (first letter of the current user's display name, or "?" if unset). Background uses a deterministic muted accent derived from `user.id`. `aria-label="Open menu"`. Tap target meets 44px.
- **Spec at M17 kickoff:** colour derivation algorithm, fallback when no display name, dark-mode variant, focus ring.

### 7.20 Suggestion Chip Row _(V2 stub)_

Subtle one-line affordance above the AddItemBar on `/list`, surfacing items the household usually buys.

```
You usually buy: Milk · Bread · Eggs                ✕
```

- **Owning milestone:** M19
- **Used by:** M19
- **Locked basics:** single line of `body-sm` text in Text Secondary. Inline item names are tap targets (each pads to 44px height via invisible padding). `✕` dismisses for 14 days. **Not** a banner; sits in its own slot above the AddItemBar, below list content. Collapses with the keyboard via Visual Viewport API.
- **Spec at M19 kickoff:** truncation rules (show up to N names, "+M more" overflow), dark-mode variant, max-line-length on tablet widths, "Make X a staple?" copy variant when frequency is ≥ 4 trips in 90 days.

---

## 8. Iconography

### 8.1 Icon Library

Use **[Lucide Icons](https://lucide.dev/)** — open source, consistent stroke width, extensive coverage, React component support.

- **Stroke width:** 1.5px consistently across all icons
- **Size:** 20px for navigation and header icons; 18px for inline/list icons; 16px for metadata
- **Colour:** Inherits from parent text colour unless explicitly overridden

### 8.2 Core Icon Assignments

```
Action / Element         Icon (Lucide)
─────────────────────────────────────────────
Add item                 Plus
Check off item           Circle → CheckCircle (animated)
Delete item              Trash2
Edit item                Pencil
Share invite code        Share2
Settings                 Settings2
Household                Home
Lists                    ShoppingCart
Members                  Users
Offline                  WifiOff
Syncing                  RefreshCw (spinning)
Synced                   Check
Collapse section         ChevronDown (rotates when collapsed)
Search                   Search
Category: Produce        Leaf
Category: Dairy          Milk
Category: Meat           Beef (or Drumstick)
Category: Pantry         Package
Category: Bakery         Cookie
Category: Beverages      Coffee
Category: Frozen         Snowflake
Category: Household      Sparkles
Category: Other          Tag
```

### 8.3 Icon Rules

- **Never** use two different icon styles (filled vs outlined) on the same screen
- Icons must always be accompanied by a visible label on navigation elements
- Avoid icons without labels for non-universal concepts (e.g. "settings gear" is universal; a "multi-list" icon is not)
- On the navigation bar, the active tab icon uses Primary 500 colour; inactive tabs use Text Secondary

---

## 9. Screen-by-Screen UX Flows

### 9.1 Screen Map

```
Launch
  ├── [No session] → Onboarding
  │     ├── Create Household → Invite Screen → List (empty)
  │     └── Join Household → List (syncing)
  └── [Session exists] → List (current household)

Main App (Tab Navigation)
  ├── Tab 1: List
  │     ├── Active items (by category)
  │     ├── Checked items (collapsed group)
  │     └── Add item bar (pinned)
  ├── Tab 2: Household
  │     ├── Household name + invite code
  │     ├── Members list
  │     └── [V1.1] Multiple lists selector
  └── Tab 3: Settings
        ├── Account (upgrade guest → full account)
        ├── Preferences (dark mode, notifications)
        └── About / feedback
```

### 9.2 Onboarding Flow

**Design principle:** Zero decisions until the user understands the value. Show, don't tell.

**Screen 1 — Splash (1.5s max)**

- App logo centred
- Soft background in Primary 50
- Animates to Screen 2 automatically
- No loading spinner — if backend is slow, this holds while connecting

**Screen 2 — Welcome**

```
        [ Logo ]

   Shopping, together.

  The list that updates in
  real time for everyone.

  ┌────────────────────────┐
  │   Create a Household   │  ← Primary button
  └────────────────────────┘

  ┌────────────────────────┐
  │   Join with a code     │  ← Secondary button
  └────────────────────────┘
```

- No sign-up required. Both buttons go straight to the action.
- Background: Background Base. Illustration sits above the headline.

**Screen 3a — Create Household**

```
  What should we call
  your household?

  ┌────────────────────────────┐
  │  The Smiths                │  ← Pre-focused, keyboard up
  └────────────────────────────┘

  ┌────────────────────────────┐
  │        Continue            │
  └────────────────────────────┘
```

- Single input, pre-focused on load (keyboard appears automatically)
- Character limit: 30. Show counter at 20+ chars.
- Pressing Enter or "Continue" proceeds

**Screen 3b — Join Household**

```
  Enter your invite code

  ┌────────────────────────────┐
  │  H H - _ _ _ _             │  ← DM Mono, large, auto-uppercase
  └────────────────────────────┘
         Joining...  (spinner)
```

- 6-character input with auto-format (adds hyphen after "HH")
- Auto-submits when 6 characters are entered — no need to tap a button
- Error state: "Code not found or expired. Check with your household." (inline, warm)

**Screen 4 — Invite Screen** (shown after creating household)

```
  You're set up! 🎉

  Invite your household

  ┌────────────────────────────┐
  │       HH - 4829            │  ← Tap to copy
  │    Tap to copy · Share →   │
  └────────────────────────────┘

  This code expires in 24 hours.

  ┌────────────────────────────┐
  │      Go to my list         │  ← Primary button
  └────────────────────────────┘

  [Skip for now]  ← text link, small, below
```

- "Go to my list" is the primary action — don't trap the user here
- "Skip for now" is always available; household can be invited later from Settings

### 9.3 Main List Screen

**This is the screen users spend 95% of their time on. It receives the most design attention.**

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  The Smiths                    ●  Sarah is here  ⚙  │  ← 56px header
├─────────────────────────────────────────────────────┤
│                                                     │
│  PRODUCE                              3 items  ˅   │  ← Section header
│  ────────────────────────────────────────────────  │
│  ○  Bananas                            Produce      │
│     1 bunch                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  ○  Apples                             Produce      │
│     Pink Lady, 6                                    │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                     │
│  DAIRY                                2 items  ˅   │
│  ────────────────────────────────────────────────  │
│  ○  Oat milk                              Dairy     │
│     2L                                              │
│                                                     │
│  ✓  CHECKED (2)                                ˅   │  ← Collapsed by default
│  ────────────────────────────────────────────────  │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  🔍  Add an item...                           [+]  │  ← Add bar, 56px
├─────────────────────────────────────────────────────┤
│  [ List ]      [ Household ]      [ Settings ]      │  ← Nav, 56px
└─────────────────────────────────────────────────────┘
```

**Checked items behaviour:**

- Checked items move to a collapsed "Checked (N)" section at the bottom
- Section is collapsed by default — users do not need to see what's already in the cart unless they want to verify
- Tapping the section expands it
- Tapping "Clear checked" (in the expanded view) shows a brief confirm prompt: "Remove 3 checked items?" — yes/no. Yes clears them permanently.

**"Done shopping?" Prompt:**
When ALL items on the list are checked, a full-width card appears above the add bar:

```
┌────────────────────────────────────────────────────┐
│   🛒  All done! Clear the list?   [Clear]  [Later] │
└────────────────────────────────────────────────────┘
```

- "Clear" immediately removes all checked items (with a satisfying sweep animation)
- "Later" dismisses the prompt; list stays as-is

### 9.4 Add Item Interaction

The add flow is a critical micro-interaction — it must feel effortless.

1. User taps the add bar
2. Keyboard rises, cursor appears in input
3. User types "ban"
4. Category chip appears: `🌿 Produce` (based on keyword matching)
5. User types "ananas" → full text "bananas"
6. User presses Enter / taps [+]
7. Input clears immediately
8. New item slides into the Produce section with a brief highlight flash (Primary 50 background, fades in 400ms)
9. Keyboard stays open for next item

**Smart category auto-detection** (keyword dictionary, V1):
The app maintains a client-side dictionary of ~200 common items mapped to categories. If no match, defaults to "Other" with a prompt: "Where does this go?" showing category chips to choose from.

### 9.5 Item Edit Flow (Bottom Sheet)

Swipe right on an item → sheet slides up:

```
┌─────────────────────────────────────────────────────┐
│  ▔▔▔▔▔▔▔ (handle)                                   │
│                                                     │
│  Edit item                                          │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Bananas                                      │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Quantity (optional)                                │
│  ┌───────────────────────────────────────────────┐  │
│  │  1 bunch                                      │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Category                                           │
│  [ Produce ] [ Dairy ] [ Meat ] [ Pantry ] ...      │ ← Scroll chips
│                                                     │
│  Note (optional)                                    │
│  ┌───────────────────────────────────────────────┐  │
│  │  Get the organic ones                         │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                   Save                        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│              Delete this item                       │  ← Destructive link
└─────────────────────────────────────────────────────┘
```

### 9.6 Household Tab

```
┌────────────────────────────────────────────────────┐
│  The Smiths                                    ✎  │  ← Edit name
│                                                    │
│  Invite code                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │          HH - 4829                           │  │
│  │       Tap to copy  ·  Share →                │  │
│  └──────────────────────────────────────────────┘  │
│  Expires in 18 hours  · Generate new code         │
│                                                    │
│  Members (2)                                       │
│  ────────────────────────────────────────────────  │
│  ◉  You (John)                              Owner  │
│  ──────────────────────────────────────────────── │
│  ◉  Sarah                                  Member  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 10. Micro-interactions & Animation

### 10.1 Principles

- Animations must have a **purpose** — they either communicate state (adding, checking, deleting) or provide feedback (tap registered, sync complete). Never animate purely for aesthetics.
- All animations under **300ms** for responses to direct user input. Anything slower feels like lag.
- Use **ease-out** for things entering the screen (list items appearing, sheets sliding up). Use **ease-in** for things leaving.
- **Respect `prefers-reduced-motion`** — all animations must be disabled or replaced with instant transitions for users who have this setting enabled.

### 10.2 Key Interactions

**Checking off an item:**

- Duration: 250ms
- The circle checkbox fills with Primary 500 and a checkmark draws itself (stroke animation)
- Simultaneously: item text transitions from Primary text to Placeholder text with line-through
- After 800ms delay: item slides down to the "Checked" section (280ms ease-in)
- The delay gives users a moment to see their action confirmed before the item disappears

**Adding an item:**

- Duration: 200ms
- Item slides in from below its insertion point in the list
- Brief background highlight (Primary 50, fades from 100% to 0% opacity over 400ms)
- The section item count increments with a small number pop (scale 1.0 → 1.3 → 1.0, 200ms)

**Deleting an item (swipe left):**

- Swipe reveals red delete zone (friction: requires 60% swipe to confirm, else snaps back)
- On confirm: item collapses height to 0 over 250ms (ease-in) — adjacent items close the gap
- A brief undo toast appears for 4 seconds: "Removed. Undo"

**Real-time update (another user adds an item):**

- Duration: 300ms
- Item slides in from the top of its category section
- Brief left border flash: 3px Primary 500 border that fades out over 600ms
- If the user's keyboard is open: item is added silently without scrolling

**Offline banner:**

- Slides down from the header (200ms ease-out)
- Does not reflow list content — it overlaps slightly to avoid content jump

**Page transitions:**

- Onboarding screens: horizontal slide (new screen slides in from right, 280ms ease-out)
- Tab switches: no animation — instant swap (tabs are not hierarchical)
- Bottom sheets: slide up from bottom, 280ms cubic-bezier(0.32, 0.72, 0, 1)

**Skeleton to content:**

- Fade crossfade from skeleton to real content (300ms)
- Stagger fade: items fade in sequentially with 40ms delay per item for a natural "populating" feel

### 10.3 CSS Specifics

```css
/* Standard easing tokens */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.32, 0.72, 0, 1); /* For sheet slides */

/* Duration tokens */
--duration-fast: 150ms; /* Hover states, button presses */
--duration-base: 250ms; /* Checkboxes, item additions */
--duration-moderate: 350ms; /* Sheet open/close, page transitions */
--duration-slow: 500ms; /* Page-level transitions (rare) */

/* Reduced motion override */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. Dark Mode

### 11.1 Implementation

Dark mode respects the system preference (`prefers-color-scheme: dark`) and can be manually overridden in Settings.

Use **CSS custom properties** for all colour values. Never hardcode hex values in component styles. This enables dark mode with a single class toggle on `<html>`:

```css
:root {
  --color-bg: #f7f6f3;
}
[data-theme='dark'] {
  --color-bg: #18181a;
}
```

### 11.2 Dark Mode Design Rules

- **Do not simply invert light mode.** Dark mode requires its own considered colour decisions.
- Background hierarchy is inverted: the darkest surface is the page background; lighter surfaces indicate elevation (cards, sheets).
- Shadows become almost invisible on dark surfaces — rely on **border and elevation** instead.
- Category chip colours use slightly brighter versions of the same hues to maintain legibility.
- Primary 500 becomes slightly lighter (`#5A9E70`) in dark mode to meet 3:1 contrast on dark backgrounds.
- The checkmark fill colour remains visible: use Primary 500 (adjusted) on Background Surface.

### 11.3 Automatic Transition

When toggling dark mode:

```css
html {
  transition:
    background-color 300ms ease,
    color 300ms ease;
}
```

Transitions only `color` and `background-color`. Do not transition all properties — it causes layout jitter.

---

## 12. Accessibility Standards

### 12.1 Target: WCAG 2.2 Level AA

All components are designed to meet WCAG 2.2 AA as a minimum.

### 12.2 Colour Contrast

| Context                                  | Minimum Ratio | Notes                           |
| ---------------------------------------- | ------------- | ------------------------------- |
| Normal body text (< 18px)                | 4.5:1         | Applies to all list item text   |
| Large text (≥ 18px / bold ≥ 14px)        | 3:1           | Headings, display text          |
| UI components (buttons, inputs, icons)   | 3:1           | Border, icon against background |
| Checked item text (grey + strikethrough) | 3:1           | Must still be readable          |

The chosen palette has been designed with these ratios in mind. **Test every colour combination using a contrast checker before shipping.**

Suggested tool: [Colour Contrast Analyser by TPGi](https://www.tpgi.com/color-contrast-checker/)

### 12.3 Touch Target Sizes

Per WCAG 2.5.8 (Level AA, WCAG 2.2):

- **Minimum:** 24×24 CSS pixels for any interactive element
- **Recommended:** 44×44 CSS pixels (Apple HIG) / 48×48 CSS pixels (Google Material) for primary actions

Our standards:

- List item checkbox tap zone: **48×48px** minimum
- Navigation tab buttons: **full tab width × 56px**
- All icon buttons: **44×44px** (padded if icon is smaller)
- Add item [+] button: **44×44px**
- Inline text links: exempt from minimum size per WCAG (inline exception)

### 12.4 Focus States

Every interactive element must have a visible focus ring for keyboard navigation:

```css
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  border-radius: 4px;
}
```

Never use `outline: none` without providing an alternative focus indicator.

### 12.5 Screen Reader Support

- All icon-only buttons must have `aria-label` (e.g., `aria-label="Delete item"`)
- Category chips use `aria-label="Category: Produce"`
- The checkbox state must be announced: `role="checkbox"` + `aria-checked="true/false"`
- Toast notifications use `role="status"` for non-urgent updates, `role="alert"` for errors
- Live sync updates use `aria-live="polite"` so screen readers announce "Sarah added Oat milk" without interrupting

### 12.6 Motion Sensitivity

All animations respect `prefers-reduced-motion: reduce`. See Section 10.3.

### 12.7 Text Scaling

The app must remain usable at browser font sizes up to 200%. Use `rem` for all font sizes. Test at 150% and 200% zoom before each release.

---

## 13. PWA-Specific Design Considerations

### 13.1 App-Like Shell

The PWA must feel native, not like a website in a browser.

- Hide browser chrome: use `"display": "standalone"` in `manifest.json`
- Status bar: use `"theme_color": "#3D8055"` (Primary 500) so the system status bar matches the app
- Splash screen: `"background_color": "#F7F6F3"` (Background Base)

### 13.2 manifest.json Key Properties

```json
{
  "name": "[App Name]",
  "short_name": "[App]",
  "theme_color": "#3D8055",
  "background_color": "#F7F6F3",
  "display": "standalone",
  "orientation": "portrait-primary",
  "start_url": "/",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

Always provide a **maskable icon** (artwork inside the safe zone with background fill) for Android adaptive icons.

### 13.3 iOS Safari Design Requirements

- **Bounce scroll:** iOS Safari has elastic scrolling. The background colour of the `<html>` element shows during overscroll — set it to Background Base to avoid a jarring white flash.
- **Bottom safe area:** Always use `env(safe-area-inset-bottom)` for the nav bar padding. iPhone home indicator must not overlap tappable elements.
- **"Add to Home Screen" Prompt:** iOS does not support the `BeforeInstallPromptEvent`. Design a custom nudge banner that appears after the user's third session:

  ```
  ┌────────────────────────────────────────────────────────┐
  │  📲  Install for the best experience                   │
  │  Safari → Share → Add to Home Screen         [Got it] │
  └────────────────────────────────────────────────────────┘
  ```

  - Appears as a dismissible banner below the header (not a modal — never interrupt the flow)
  - Only shown in Safari, only shown if not already installed
  - Dismissed state stored in localStorage — never shown again after dismissal

### 13.4 Keyboard Handling

On mobile, the virtual keyboard pushes the viewport up or resizes it. This causes the bottom nav and add bar to jump awkwardly if not handled.

Solution: use the **Visual Viewport API** to track keyboard height and adjust the add bar position:

```js
window.visualViewport.addEventListener('resize', () => {
  const keyboardHeight = window.innerHeight - window.visualViewport.height
  addBar.style.bottom = `${keyboardHeight}px`
})
```

This keeps the add bar always visible just above the keyboard — a critical UX detail.

### 13.5 Pull-to-Refresh

Native pull-to-refresh conflicts with the app's own scroll. Disable browser pull-to-refresh via:

```css
body {
  overscroll-behavior-y: contain;
}
```

Implement a custom pull-to-refresh indicator in the app header area if manual refresh is ever needed (for V1, real-time sync makes this unnecessary).

---

## 14. Responsive Breakpoints

The app is **mobile-first**. The following breakpoints expand the experience on larger screens:

```
Breakpoint    Width        Layout change
──────────────────────────────────────────────────────
Mobile        < 480px      Single column, bottom nav, full-width components
Mobile-L      480–767px    Slight padding increase; max-width 560px centred
Tablet        768–1023px   Bottom nav → left sidebar (64px icon-only)
                           Content area centred, max-width 640px
Desktop       ≥ 1024px     Left sidebar expands to 220px (icons + labels)
                           Main content max-width 680px
                           Add bar converts to inline input at top of list
```

**Design decision:** This is a mobile app that also works on desktop — not the reverse. The desktop layout is a comfort enhancement, not the primary experience. Do not add desktop-only features in V1.

---

## 15. Design Do's and Don'ts

### ✅ Do

- **Do** use the add bar as the single entry point for new items — keep it always visible
- **Do** show real names ("Sarah added Oat milk") — it reinforces the collaborative nature
- **Do** auto-detect categories — remove a decision from the user's path
- **Do** keep checked items accessible but de-emphasised — they still serve a purpose in-store
- **Do** use subtle animations to communicate sync state — a spinning indicator or brief flash is better than nothing
- **Do** provide an undo for all destructive actions (delete, clear checked)
- **Do** make the invite code the most visually prominent element on the household screen
- **Do** test the app in bright sunlight conditions (high brightness, glare) — increase contrast if any element becomes illegible
- **Do** test with one hand, thumb navigation — all core actions (add, check, delete) must be reachable by the right thumb on a standard phone
- **Do** keep the header minimal — household name + one action icon. Resist adding more.

### ❌ Don't

- **Don't** use modals for adding items — the inline bottom bar is 3× faster
- **Don't** show a spinner while adding an item — optimistic updates make this unnecessary and it feels slow
- **Don't** require category selection when adding items — auto-detect and let the user override if wrong
- **Don't** put important actions behind a hamburger menu — navigation must always be visible
- **Don't** use red colour anywhere except destructive actions (delete, error)
- **Don't** animate list reordering when another user's changes sync — it's disorienting. Silently insert items in the correct position.
- **Don't** show "last synced X minutes ago" prominently — it creates anxiety. Only show sync status when things go wrong (offline banner) or succeed (brief checkmark flash)
- **Don't** add onboarding tutorials or tooltips in V1 — if the interface requires explanation, redesign the interface
- **Don't** use more than 2 font weights on a single screen
- **Don't** underline text for decoration — underlines signal links only

---

## 16. Design Tokens Reference

A complete list of design tokens for implementation in Tailwind CSS config or CSS custom properties.

### 16.1 Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-base': '#F7F6F3',
        'bg-surface': '#FFFFFF',
        'bg-elevated': '#F0EEE9',
        'bg-muted': '#ECEAE4',

        // Text
        'text-primary': '#1C1C1A',
        'text-secondary': '#6B6860',
        'text-placeholder': '#AEABA3',
        'text-disabled': '#C8C5BD',
        'text-inverse': '#FFFFFF',

        // Brand
        'primary-50': '#EDF4EF',
        'primary-100': '#D5E8DB',
        'primary-200': '#A8CFAF',
        'primary-300': '#78B384',
        'primary-400': '#52996A',
        'primary-500': '#3D8055',
        'primary-600': '#2F6642',
        'primary-700': '#214D31',

        // Semantic
        success: '#3D8055',
        warning: '#B97C2E',
        error: '#C0392B',
        info: '#2E6BA8',

        // Borders
        'border-default': '#E4E2DC',
        'border-focused': '#3D8055',
        'border-destructive': '#C0392B',

        // Categories
        'cat-produce': '#6B9E60',
        'cat-dairy': '#5B8EB8',
        'cat-meat': '#C26B5A',
        'cat-pantry': '#B89A56',
        'cat-bakery': '#C2895A',
        'cat-frozen': '#7B9EB8',
        'cat-beverages': '#8B6BAE',
        'cat-household': '#8A8A8A',
        'cat-care': '#B8607A',
        'cat-other': '#9B9287',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', '-apple-system', 'sans-serif'],
        body: ['DM Sans', '-apple-system', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      fontSize: {
        'display-lg': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-sm': ['24px', { lineHeight: '1.25', fontWeight: '700' }],
        'heading-lg': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-sm': ['17px', { lineHeight: '1.35', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        label: ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '16px',
        '2xl': '20px',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-spring': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        moderate: '350ms',
      },
    },
  },
}
```

### 16.2 CSS Custom Properties (for dark mode)

```css
:root {
  /* Backgrounds */
  --color-bg-base: #f7f6f3;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #f0eee9;
  --color-bg-muted: #eceae4;

  /* Text */
  --color-text-primary: #1c1c1a;
  --color-text-secondary: #6b6860;
  --color-text-placeholder: #aeaba3;
  --color-text-disabled: #c8c5bd;
  --color-text-inverse: #ffffff;

  /* Brand */
  --color-primary: #3d8055;
  --color-primary-hover: #2f6642;
  --color-primary-press: #214d31;
  --color-primary-subtle: #edf4ef;

  /* Semantic */
  --color-error: #c0392b;
  --color-warning: #b97c2e;
  --color-success: #3d8055;

  /* Borders */
  --color-border: #e4e2dc;
  --color-border-focus: #3d8055;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(28, 28, 26, 0.08), 0 1px 2px rgba(28, 28, 26, 0.06);
  --shadow-md: 0 4px 12px rgba(28, 28, 26, 0.1), 0 2px 6px rgba(28, 28, 26, 0.06);
  --shadow-lg: 0 8px 24px rgba(28, 28, 26, 0.12), 0 4px 12px rgba(28, 28, 26, 0.08);
}

[data-theme='dark'] {
  --color-bg-base: #18181a;
  --color-bg-surface: #242426;
  --color-bg-elevated: #2e2e31;
  --color-bg-muted: #38383c;
  --color-text-primary: #f0efec;
  --color-text-secondary: #9e9a92;
  --color-text-placeholder: #5c5a55;
  --color-text-disabled: #46443f;
  --color-text-inverse: #1c1c1a;
  --color-primary: #5a9e70;
  --color-primary-hover: #4a8460;
  --color-primary-subtle: #1c2e22;
  --color-border: #3a3a3e;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}
```

---

_This document is the single source of truth for all design decisions. Any deviation must be discussed and this document updated before implementation. The document should be reviewed and updated at the start of each new version milestone._

// Shared date formatting for the Plan tab. All formatters render in the
// viewer's device timezone — the household timezone is only used for
// scheduling math (see CLAUDE.md §17). What the user sees here is "next bin
// night in *my* local time", which is the right surface for both members at
// home and members traveling.

function isToday(d: Date, now: Date = new Date()): boolean {
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isTomorrow(d: Date, now: Date = new Date()): boolean {
  const t = new Date(now)
  t.setDate(t.getDate() + 1)
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  )
}

function timePart(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Compact "Next: …" label used in the row. Today/Tomorrow get the friendly
// shorthand; this-week gets the day name; further out gets a date.
export function formatNextFire(d: Date, now: Date = new Date()): string {
  if (isToday(d, now)) return `Today, ${timePart(d)}`
  if (isTomorrow(d, now)) return `Tomorrow, ${timePart(d)}`
  const days = Math.floor((d.getTime() - now.getTime()) / 86_400_000)
  if (days >= 0 && days < 7) {
    return `${d.toLocaleDateString(undefined, { weekday: 'short' })}, ${timePart(d)}`
  }
  const sameYear = d.getFullYear() === now.getFullYear()
  return (
    d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: sameYear ? undefined : 'numeric',
    }) + ` · ${timePart(d)}`
  )
}

// Long-form label for the "Next 3 fires" preview.
export function formatPreviewFire(d: Date, now: Date = new Date()): string {
  const sameYear = d.getFullYear() === now.getFullYear()
  return `${d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  })} · ${timePart(d)}`
}

// Buckets for the grouped list. Anything fired-and-deactivated (is_active
// false) is filtered out before this runs.
export type Bucket = 'today' | 'this_week' | 'later'

export function bucketFor(d: Date, now: Date = new Date()): Bucket {
  if (isToday(d, now)) return 'today'
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  if (d >= start && d < end) return 'this_week'
  return 'later'
}

// ────────────────────────────────────────────────────────────────────────────
// M18 — Tasks
// ────────────────────────────────────────────────────────────────────────────

// Parse a date-only string (YYYY-MM-DD, as stored in tasks.due_date) into a
// Date pinned to the viewer's local midnight. The DB stores no time, so we
// must NOT use `new Date(iso)` — that parses as UTC midnight, which renders
// as "the day before" in any negative-UTC timezone.
export function parseDueDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((n) => Number(n))
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// Returns the count of whole days from `now` (local midnight) to `due` (local
// midnight). Negative = overdue, 0 = today, 1 = tomorrow, etc.
export function daysUntilDue(due: Date, now: Date = new Date()): number {
  const a = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((a - b) / 86_400_000)
}

// Compact label shown on the right of a TaskRow.
//   undated     → ""        (renders as the empty pill, hidden visually)
//   today       → "Today"
//   tomorrow    → "Tomorrow"
//   < 0         → "Overdue · 3d"
//   < 7         → "Mon"
//   same year   → "Mon 2 Jun"
//   other year  → "2 Jun 2027"
export function formatDueLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return ''
  const due = parseDueDate(iso)
  const days = daysUntilDue(due, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 0) {
    const n = Math.abs(days)
    return `Overdue · ${n}d`
  }
  if (days < 7) return due.toLocaleDateString(undefined, { weekday: 'short' })
  const sameYear = due.getFullYear() === now.getFullYear()
  return due.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  })
}

// True if the task is past its due date (date-only comparison in local tz).
export function isOverdue(iso: string | null, now: Date = new Date()): boolean {
  if (!iso) return false
  return daysUntilDue(parseDueDate(iso), now) < 0
}

// Sort comparator for the Open bucket: due_date asc nulls last, then
// created_at asc (D7). Stable for equal-due tasks.
export function compareOpenTasks(
  a: { due_date: string | null; created_at: string },
  b: { due_date: string | null; created_at: string },
): number {
  if (a.due_date === null && b.due_date === null) {
    return a.created_at.localeCompare(b.created_at)
  }
  if (a.due_date === null) return 1
  if (b.due_date === null) return -1
  if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date)
  return a.created_at.localeCompare(b.created_at)
}

// Compact "completed Xm/h/d ago" label for the Completed bucket.
export function formatCompletedAgo(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const completed = new Date(iso)
  const sameYear = completed.getFullYear() === now.getFullYear()
  return completed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  })
}

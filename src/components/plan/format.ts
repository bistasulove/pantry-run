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

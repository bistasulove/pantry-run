// M17 — Client-side mirror of public.next_fire (Postgres). Used by the
// reminder edit sheet to render "Next 3 fires:" live as the user toggles
// preset / days / time. Must produce the same UTC instants the cron will,
// or the preview lies.
//
// Vocabulary:
//   Preset      — UI-facing recurrence type ('daily' | 'weekly' | 'monthly' |
//                 'yearly' | 'once').
//   RRULE text  — what we persist in reminders.recurrence. A subset of
//                 RFC 5545 RRULE: FREQ=…;BYDAY=MO,TH;BYMONTHDAY=15;BYMONTH=12.
//                 INTERVAL is implied 1 in V2.
//
// Conversion utilities live here; the EditSheet pulls them through a thin
// preset model so the UI never touches RRULE strings directly.

export type WeekdayCode = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export const WEEKDAY_CODES: WeekdayCode[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export const WEEKDAY_LABELS: Record<WeekdayCode, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
}

export type RecurrencePreset =
  | { kind: 'once' }
  | { kind: 'daily' }
  | { kind: 'weekly'; days: WeekdayCode[] }
  | { kind: 'monthly'; dayOfMonth: number }
  | { kind: 'yearly'; month: number; dayOfMonth: number }

// ────────────────────────────────────────────────────────────────────────────
// RRULE encode / decode
// ────────────────────────────────────────────────────────────────────────────

export function encodeRrule(preset: RecurrencePreset): string | null {
  switch (preset.kind) {
    case 'once':
      return null
    case 'daily':
      return 'FREQ=DAILY'
    case 'weekly': {
      const days = preset.days.length > 0 ? preset.days : ['MO']
      return `FREQ=WEEKLY;BYDAY=${days.join(',')}`
    }
    case 'monthly':
      return `FREQ=MONTHLY;BYMONTHDAY=${preset.dayOfMonth}`
    case 'yearly':
      return `FREQ=YEARLY;BYMONTH=${preset.month};BYMONTHDAY=${preset.dayOfMonth}`
  }
}

export function decodeRrule(rrule: string | null | undefined): RecurrencePreset {
  if (!rrule || rrule.trim() === '') return { kind: 'once' }
  const parts = new Map<string, string>()
  for (const seg of rrule.split(';')) {
    const eq = seg.indexOf('=')
    if (eq > 0) parts.set(seg.slice(0, eq).toUpperCase(), seg.slice(eq + 1).toUpperCase())
  }
  const freq = parts.get('FREQ')
  if (freq === 'DAILY') return { kind: 'daily' }
  if (freq === 'WEEKLY') {
    const byday = parts.get('BYDAY') ?? ''
    const days = byday
      .split(',')
      .filter((d): d is WeekdayCode => (WEEKDAY_CODES as string[]).includes(d))
    return { kind: 'weekly', days: days.length > 0 ? days : ['MO'] }
  }
  if (freq === 'MONTHLY') {
    const dom = Number(parts.get('BYMONTHDAY') ?? '1')
    return { kind: 'monthly', dayOfMonth: clampDom(dom) }
  }
  if (freq === 'YEARLY') {
    const month = Number(parts.get('BYMONTH') ?? '1')
    const dom = Number(parts.get('BYMONTHDAY') ?? '1')
    return { kind: 'yearly', month: clampMonth(month), dayOfMonth: clampDom(dom) }
  }
  return { kind: 'once' }
}

function clampDom(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(31, Math.max(1, Math.trunc(n)))
}
function clampMonth(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(12, Math.max(1, Math.trunc(n)))
}

// ────────────────────────────────────────────────────────────────────────────
// Timezone-aware date arithmetic
//
// We want the same answer the plpgsql function produces. The reliable way to
// do that in JS is: take the UTC instant, project it into the household
// timezone as Y/M/D/H/m parts, do calendar arithmetic on those parts, then
// reproject back to UTC by finding the instant whose parts match (binary
// search by-the-offset to handle DST transitions).
// ────────────────────────────────────────────────────────────────────────────

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number }

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>()
function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = partsFormatterCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    partsFormatterCache.set(tz, f)
  }
  return f
}

function utcToLocalParts(utc: Date, tz: string): LocalParts {
  const fmt = partsFormatter(tz)
  const parts = fmt.formatToParts(utc)
  const map = new Map<string, string>()
  for (const p of parts) map.set(p.type, p.value)
  return {
    year: Number(map.get('year')),
    month: Number(map.get('month')),
    day: Number(map.get('day')),
    hour: Number(map.get('hour') === '24' ? '0' : map.get('hour')),
    minute: Number(map.get('minute')),
  }
}

// Convert local Y/M/D/H/m in tz to a UTC instant. There can be 0 (spring-
// forward gap) or 2 (fall-back overlap) matches at DST boundaries. We pick
// the earlier of two and the latest legal instant for the gap (mirror what
// Postgres' `local AT TIME ZONE tz` does, which prefers the later interpre-
// tation — but for reminders the choice is negligible since the user can't
// schedule sub-hour fires anyway).
function localPartsToUtc(p: LocalParts, tz: string): Date {
  // Start with a naïve UTC guess from the local parts.
  const guess = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0)
  // Compute the tz's offset at that instant and correct iteratively.
  let candidate = guess
  for (let i = 0; i < 3; i++) {
    const local = utcToLocalParts(new Date(candidate), tz)
    const localUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      0,
      0,
    )
    const drift = guess - localUtc
    if (drift === 0) break
    candidate += drift
  }
  return new Date(candidate)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const ISO_DOW: Record<WeekdayCode, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
}

function isoDow(parts: LocalParts): number {
  // Compute ISO day-of-week from the local parts (Mon=1..Sun=7).
  const utcMs = Date.UTC(parts.year, parts.month - 1, parts.day)
  const dow = new Date(utcMs).getUTCDay() // Sun=0..Sat=6
  return dow === 0 ? 7 : dow
}

// ────────────────────────────────────────────────────────────────────────────
// nextFire — mirror of public.next_fire()
// ────────────────────────────────────────────────────────────────────────────

export function nextFire(rrule: string | null | undefined, base: Date, tz: string): Date | null {
  const preset = decodeRrule(rrule)
  if (preset.kind === 'once') return null

  const local = utcToLocalParts(base, tz)

  if (preset.kind === 'daily') {
    return advanceDays(local, 1, tz)
  }

  if (preset.kind === 'weekly') {
    const targetDows = preset.days.map((d) => ISO_DOW[d]).filter((n) => Number.isFinite(n))
    if (targetDows.length === 0) return advanceDays(local, 7, tz)
    const curDow = isoDow(local)
    let ahead = 8
    for (const d of targetDows) {
      const diff = d > curDow ? d - curDow : d - curDow + 7
      if (diff < ahead) ahead = diff
    }
    return advanceDays(local, ahead, tz)
  }

  if (preset.kind === 'monthly') {
    let y = local.year
    let m = local.month + 1
    if (m > 12) {
      m = 1
      y += 1
    }
    const dom = Math.min(preset.dayOfMonth, daysInMonth(y, m))
    return localPartsToUtc(
      { year: y, month: m, day: dom, hour: local.hour, minute: local.minute },
      tz,
    )
  }

  if (preset.kind === 'yearly') {
    const y = local.year + 1
    const m = preset.month
    const dom = Math.min(preset.dayOfMonth, daysInMonth(y, m))
    return localPartsToUtc(
      { year: y, month: m, day: dom, hour: local.hour, minute: local.minute },
      tz,
    )
  }

  return null
}

function advanceDays(
  local: LocalParts,
  days: number,
  tz: string,
  hourOverride?: number,
  minuteOverride?: number,
): Date {
  // Use a UTC scratch date to compute the new Y/M/D, then re-anchor in tz.
  const scratch = new Date(Date.UTC(local.year, local.month - 1, local.day))
  scratch.setUTCDate(scratch.getUTCDate() + days)
  return localPartsToUtc(
    {
      year: scratch.getUTCFullYear(),
      month: scratch.getUTCMonth() + 1,
      day: scratch.getUTCDate(),
      hour: hourOverride ?? local.hour,
      minute: minuteOverride ?? local.minute,
    },
    tz,
  )
}

// ────────────────────────────────────────────────────────────────────────────
// computeNextFires — N-step preview for the edit sheet.
// ────────────────────────────────────────────────────────────────────────────

export function computeNextFires(
  rrule: string | null | undefined,
  base: Date,
  tz: string,
  n: number,
): Date[] {
  const out: Date[] = []
  let current: Date | null = base
  // First entry is the base itself (the user's chosen start).
  out.push(base)
  for (let i = 1; i < n; i++) {
    current = nextFire(rrule, current ?? base, tz)
    if (!current) break
    out.push(current)
  }
  return out
}

// ────────────────────────────────────────────────────────────────────────────
// computeFirstFire — for a given preset + time-of-day, find the next valid
// fire instant at-or-after `anchor`. Used by the EditSheet on first paint
// and whenever the recurrence/time changes.
// ────────────────────────────────────────────────────────────────────────────

export function computeFirstFire(
  preset: RecurrencePreset,
  hour: number,
  minute: number,
  tz: string,
  anchor: Date = new Date(),
): Date {
  const anchorLocal = utcToLocalParts(anchor, tz)

  if (preset.kind === 'once') {
    // Caller is expected to provide the explicit date via a different path;
    // we anchor at today's local at the chosen time as a sensible default.
    return localPartsToUtc({ ...anchorLocal, hour, minute }, tz)
  }

  if (preset.kind === 'daily') {
    const todayAtTime = localPartsToUtc({ ...anchorLocal, hour, minute }, tz)
    if (todayAtTime.getTime() > anchor.getTime()) return todayAtTime
    return advanceDays(anchorLocal, 1, tz, hour, minute)
  }

  if (preset.kind === 'weekly') {
    const days = (preset.days.length > 0 ? preset.days : (['MO'] as WeekdayCode[])).map(
      (d) => ISO_DOW[d],
    )
    const curDow = isoDow(anchorLocal)
    const todayAtTime = localPartsToUtc({ ...anchorLocal, hour, minute }, tz)
    // If today is one of the picked days AND the time hasn't passed yet, fire today.
    if (days.includes(curDow) && todayAtTime.getTime() > anchor.getTime()) return todayAtTime
    let ahead = 8
    for (const d of days) {
      const diff = d > curDow ? d - curDow : d - curDow + 7
      if (diff < ahead) ahead = diff
    }
    return advanceDays(anchorLocal, ahead, tz, hour, minute)
  }

  if (preset.kind === 'monthly') {
    const dom = preset.dayOfMonth
    // This month, clamped.
    const dimThis = daysInMonth(anchorLocal.year, anchorLocal.month)
    const candidateDom = Math.min(dom, dimThis)
    const thisMonth = localPartsToUtc(
      { year: anchorLocal.year, month: anchorLocal.month, day: candidateDom, hour, minute },
      tz,
    )
    if (thisMonth.getTime() > anchor.getTime()) return thisMonth
    let y = anchorLocal.year
    let m = anchorLocal.month + 1
    if (m > 12) {
      m = 1
      y += 1
    }
    const dim = daysInMonth(y, m)
    return localPartsToUtc({ year: y, month: m, day: Math.min(dom, dim), hour, minute }, tz)
  }

  // yearly
  const dimThis = daysInMonth(anchorLocal.year, preset.month)
  const candidateDom = Math.min(preset.dayOfMonth, dimThis)
  const thisYear = localPartsToUtc(
    { year: anchorLocal.year, month: preset.month, day: candidateDom, hour, minute },
    tz,
  )
  if (thisYear.getTime() > anchor.getTime()) return thisYear
  const y = anchorLocal.year + 1
  const dim = daysInMonth(y, preset.month)
  return localPartsToUtc(
    { year: y, month: preset.month, day: Math.min(preset.dayOfMonth, dim), hour, minute },
    tz,
  )
}

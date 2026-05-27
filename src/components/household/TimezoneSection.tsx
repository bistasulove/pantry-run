'use client'

import { Globe } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'

// Curated subset of IANA zones — covers ~95% of Pantry Run's likely user base
// without forcing the user to scroll past 400 entries. The current household
// timezone is always inserted at the top so it's reachable even if it isn't
// in this list (e.g. a household imported from a different region).
//
// Picker editing is open to every household member per M17 D4. The
// set_household_timezone RPC enforces the membership check server-side.

const CURATED_ZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Australia/Perth',
  'Pacific/Auckland',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'UTC',
] as const

function describeOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    const name = parts.find((p) => p.type === 'timeZoneName')
    return name ? name.value : ''
  } catch {
    return ''
  }
}

export function TimezoneSection() {
  const householdId = useHouseholdStore((s) => s.householdId)
  const timezone = useHouseholdStore((s) => s.timezone)
  const setTimezone = useHouseholdStore((s) => s.setTimezone)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)

  const options = useMemo(() => {
    const all = new Set<string>(CURATED_ZONES)
    if (timezone) all.add(timezone)
    return Array.from(all).sort()
  }, [timezone])

  async function handleChange(next: string) {
    if (!householdId || next === timezone || saving) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('set_household_timezone', {
      p_household_id: householdId,
      p_timezone: next,
    })
    setSaving(false)
    if (error) {
      console.error('[TimezoneSection] save failed', error)
      setToast({ message: "Couldn't update the timezone. Try again." })
      return
    }
    setTimezone(next)
    setToast({ message: 'Timezone updated' })
  }

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h3 className="text-text-primary flex items-center gap-2 text-[17px] leading-normal font-semibold">
          <Globe size={18} strokeWidth={1.5} aria-hidden />
          Timezone
        </h3>
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Reminders fire in this timezone — so &ldquo;every Thursday at 7pm&rdquo; means 7pm here,
          year-round.
        </p>
      </header>
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">Household timezone</span>
        <select
          value={timezone ?? 'Australia/Sydney'}
          onChange={(e) => void handleChange(e.target.value)}
          disabled={saving}
          className="border-border-default bg-bg-surface text-text-primary h-11 rounded-xl border px-3 text-[16px] leading-relaxed"
        >
          {options.map((tz) => {
            const offset = describeOffset(tz)
            return (
              <option key={tz} value={tz}>
                {tz}
                {offset ? ` (${offset})` : ''}
              </option>
            )
          })}
        </select>
      </label>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </section>
  )
}

export default TimezoneSection

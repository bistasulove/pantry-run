'use client'

import { useMemo } from 'react'

import { bucketFor, type Bucket } from '@/components/plan/format'
import { ReminderRow } from '@/components/plan/ReminderRow'
import type { Member } from '@/store/householdStore'
import type { Reminder } from '@/store/reminderStore'

interface RemindersListProps {
  reminders: Reminder[]
  members: Member[]
  onOpen: (reminder: Reminder) => void
}

const BUCKETS: Array<{ key: Bucket; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This week' },
  { key: 'later', label: 'Later' },
]

export function RemindersList({ reminders, members, onOpen }: RemindersListProps) {
  const grouped = useMemo(() => {
    const now = new Date()
    const buckets: Record<Bucket, Reminder[]> = { today: [], this_week: [], later: [] }
    for (const r of reminders) {
      if (!r.is_active) continue
      const b = bucketFor(new Date(r.next_fire_at), now)
      buckets[b].push(r)
    }
    for (const key of Object.keys(buckets) as Bucket[]) {
      buckets[key].sort((a, b) => a.next_fire_at.localeCompare(b.next_fire_at))
    }
    return buckets
  }, [reminders])

  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      {BUCKETS.map((b) =>
        grouped[b.key].length === 0 ? null : (
          <section key={b.key} className="flex flex-col gap-2">
            <h2 className="text-text-secondary text-[13px] leading-snug font-semibold tracking-wide uppercase">
              {b.label}
            </h2>
            <ul className="flex flex-col gap-2">
              {grouped[b.key].map((r) => (
                <li key={r.id}>
                  <ReminderRow reminder={r} members={members} onClick={() => onOpen(r)} />
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  )
}

export default RemindersList

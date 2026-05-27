'use client'

import { Bell, User } from 'lucide-react'

import { formatNextFire } from '@/components/plan/format'
import type { Reminder } from '@/store/reminderStore'
import type { Member } from '@/store/householdStore'

interface ReminderRowProps {
  reminder: Reminder
  members: Member[]
  onClick: () => void
}

function leadLabel(lead: number): string | null {
  if (lead === 0) return null
  if (lead === 15) return '15 min lead'
  if (lead === 60) return '1 hr lead'
  if (lead === 1440) return '1 day lead'
  if (lead < 60) return `${lead} min lead`
  if (lead % 60 === 0) return `${lead / 60} hr lead`
  return `${lead} min lead`
}

export function ReminderRow({ reminder, members, onClick }: ReminderRowProps) {
  const nextAt = new Date(reminder.next_fire_at)
  const assignee = reminder.assignee_id
    ? members.find((m) => m.userId === reminder.assignee_id)
    : null
  const assigneeLabel = reminder.assignee_id
    ? (assignee?.displayName?.trim() ?? 'Former member')
    : 'Whole household'
  const lead = leadLabel(reminder.lead_minutes)

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-bg-surface border-border-default hover:border-accent/50 flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-150"
    >
      <span className="bg-bg-base text-accent mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
        <Bell size={18} strokeWidth={1.5} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-text-primary truncate text-[16px] leading-relaxed font-semibold">
          {reminder.title}
        </span>
        <span className="text-text-secondary truncate text-[13px] leading-snug">
          {formatNextFire(nextAt)}
          {lead ? ` · ${lead}` : ''}
        </span>
        <span className="text-text-secondary flex items-center gap-1 truncate text-[12px] leading-snug">
          <User size={12} strokeWidth={1.5} aria-hidden />
          {assigneeLabel}
        </span>
      </span>
    </button>
  )
}

export default ReminderRow

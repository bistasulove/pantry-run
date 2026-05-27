'use client'

import type { Member } from '@/store/householdStore'

interface AssigneePickerProps {
  value: string | null
  members: Member[]
  onChange: (next: string | null) => void
  // What the null row says. Reminders use "Whole household" (fan-out to
  // every member); tasks use "Unassigned" (nobody specifically responsible).
  // Defaults to the reminder phrasing for backward compat with M17.
  unassignedLabel?: string
}

// Radio-list assignee picker. null = whole household (reminders) /
// unassigned (tasks); otherwise a userId. Falls back to null if the
// previously-assigned member has since left (no row matches the userId).

export function AssigneePicker({
  value,
  members,
  onChange,
  unassignedLabel = 'Whole household',
}: AssigneePickerProps) {
  const knownIds = new Set(members.map((m) => m.userId))
  const safeValue = value !== null && !knownIds.has(value) ? null : value

  return (
    <fieldset className="border-border-default flex flex-col gap-1 rounded-xl border p-2">
      <legend className="sr-only">Assigned to</legend>
      <Option
        label={unassignedLabel}
        selected={safeValue === null}
        onClick={() => onChange(null)}
      />
      {members.map((m) => (
        <Option
          key={m.userId}
          label={m.displayName?.trim() || 'Unnamed member'}
          selected={safeValue === m.userId}
          onClick={() => onChange(m.userId)}
        />
      ))}
    </fieldset>
  )
}

function Option({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex h-11 w-full items-center justify-between rounded-lg px-2 text-left text-[15px] leading-relaxed transition-colors duration-150 ${
        selected ? 'text-text-primary font-semibold' : 'text-text-secondary'
      }`}
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          selected ? 'border-accent' : 'border-border-default'
        }`}
      >
        {selected ? <span className="bg-accent h-2.5 w-2.5 rounded-full" /> : null}
      </span>
    </button>
  )
}

export default AssigneePicker

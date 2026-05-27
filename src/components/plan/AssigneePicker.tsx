'use client'

import type { Member } from '@/store/householdStore'

interface AssigneePickerProps {
  value: string | null
  members: Member[]
  onChange: (next: string | null) => void
}

// Radio-list assignee picker. null = whole household; otherwise a userId.
// Falls back to "Whole household" if the previously-assigned member has
// since left (no row matches the userId).

export function AssigneePicker({ value, members, onChange }: AssigneePickerProps) {
  const knownIds = new Set(members.map((m) => m.userId))
  const safeValue = value !== null && !knownIds.has(value) ? null : value

  return (
    <fieldset className="border-border-default flex flex-col gap-1 rounded-xl border p-2">
      <legend className="sr-only">Assigned to</legend>
      <Option
        label="Whole household"
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

'use client'

interface LeadMinutesPickerProps {
  value: number
  onChange: (next: number) => void
}

const OPTIONS: Array<{ minutes: number; label: string }> = [
  { minutes: 0, label: 'On time' },
  { minutes: 15, label: '15 min before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
]

export function LeadMinutesPicker({ value, onChange }: LeadMinutesPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Notify">
      {OPTIONS.map((opt) => {
        const selected = value === opt.minutes
        return (
          <button
            key={opt.minutes}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.minutes)}
            className={`flex h-9 items-center justify-center rounded-lg px-3 text-[13px] leading-snug font-medium transition-colors duration-150 ${
              selected
                ? 'bg-accent text-white'
                : 'bg-bg-base text-text-secondary border-border-default border'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default LeadMinutesPicker

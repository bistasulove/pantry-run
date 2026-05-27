'use client'

import type { RecurrencePreset, WeekdayCode } from '@/lib/recurrence'
import { WEEKDAY_CODES, WEEKDAY_LABELS } from '@/lib/recurrence'

// Preset picker for the reminder edit sheet. Renders a small chip row of
// frequency options + the frequency-specific sub-control inline. UI only;
// the parent owns the preset state and calls computeFirstFire when the
// preset or time changes.

interface RecurrencePresetPickerProps {
  value: RecurrencePreset
  onChange: (next: RecurrencePreset) => void
}

const KINDS: Array<{ kind: RecurrencePreset['kind']; label: string }> = [
  { kind: 'once', label: 'Once' },
  { kind: 'daily', label: 'Daily' },
  { kind: 'weekly', label: 'Weekly' },
  { kind: 'monthly', label: 'Monthly' },
  { kind: 'yearly', label: 'Yearly' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function defaultForKind(kind: RecurrencePreset['kind']): RecurrencePreset {
  switch (kind) {
    case 'once':
      return { kind: 'once' }
    case 'daily':
      return { kind: 'daily' }
    case 'weekly':
      return { kind: 'weekly', days: ['TH'] }
    case 'monthly':
      return { kind: 'monthly', dayOfMonth: 1 }
    case 'yearly':
      return { kind: 'yearly', month: 1, dayOfMonth: 1 }
  }
}

export function RecurrencePresetPicker({ value, onChange }: RecurrencePresetPickerProps) {
  function setKind(kind: RecurrencePreset['kind']) {
    if (kind === value.kind) return
    onChange(defaultForKind(kind))
  }

  function toggleWeekday(code: WeekdayCode) {
    if (value.kind !== 'weekly') return
    const has = value.days.includes(code)
    const next = has ? value.days.filter((d) => d !== code) : [...value.days, code]
    // Don't allow empty selection — fall back to MO.
    onChange({ kind: 'weekly', days: next.length === 0 ? ['MO'] : next })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Repeats">
        {KINDS.map((k) => {
          const selected = value.kind === k.kind
          return (
            <button
              key={k.kind}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setKind(k.kind)}
              className={`flex h-9 min-w-[64px] items-center justify-center rounded-lg px-3 text-[13px] leading-snug font-medium transition-colors duration-150 ${
                selected
                  ? 'bg-accent text-white'
                  : 'bg-bg-base text-text-secondary border-border-default border'
              }`}
            >
              {k.label}
            </button>
          )
        })}
      </div>

      {value.kind === 'weekly' ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of week">
          {WEEKDAY_CODES.map((code) => {
            const selected = value.days.includes(code)
            return (
              <button
                key={code}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleWeekday(code)}
                className={`flex h-10 w-12 items-center justify-center rounded-lg text-[13px] leading-snug font-semibold transition-colors duration-150 ${
                  selected
                    ? 'bg-accent text-white'
                    : 'bg-bg-base text-text-secondary border-border-default border'
                }`}
              >
                {WEEKDAY_LABELS[code]}
              </button>
            )
          })}
        </div>
      ) : null}

      {value.kind === 'monthly' ? (
        <label className="flex flex-col gap-1.5 text-[13px] leading-snug">
          <span className="text-text-secondary font-medium">On day</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={value.dayOfMonth}
            onChange={(e) => {
              const n = Math.min(31, Math.max(1, Number(e.target.value) || 1))
              onChange({ kind: 'monthly', dayOfMonth: n })
            }}
            className="border-border-default bg-bg-surface text-text-primary h-11 w-24 rounded-xl border px-3 text-[16px] leading-relaxed"
          />
          <span className="text-text-secondary text-[12px] leading-snug">
            Months with fewer days clamp to the last day.
          </span>
        </label>
      ) : null}

      {value.kind === 'yearly' ? (
        <div className="flex gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] leading-snug">
            <span className="text-text-secondary font-medium">Month</span>
            <select
              value={value.month}
              onChange={(e) =>
                onChange({
                  ...value,
                  month: Math.min(12, Math.max(1, Number(e.target.value) || 1)),
                })
              }
              className="border-border-default bg-bg-surface text-text-primary h-11 rounded-xl border px-3 text-[16px] leading-relaxed"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] leading-snug">
            <span className="text-text-secondary font-medium">Day</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={value.dayOfMonth}
              onChange={(e) =>
                onChange({
                  ...value,
                  dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                })
              }
              className="border-border-default bg-bg-surface text-text-primary h-11 w-24 rounded-xl border px-3 text-[16px] leading-relaxed"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export default RecurrencePresetPicker

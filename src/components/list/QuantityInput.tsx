'use client'

import { useId, useState } from 'react'

import { isUnitKey, UNITS, unitLabel, type UnitKey } from '@/lib/units'

interface QuantityInputProps {
  value: number | null
  unit: UnitKey | null
  onChange: (next: { value: number | null; unit: UnitKey | null }) => void
  error?: string | null
}

// Accepts the digits the schema's numeric(6,2) can store: up to 4 integer digits
// + up to 2 decimal digits. Trailing dot is allowed mid-entry ("1.") so typing
// feels natural; the parent stores the parsed number, the buffer keeps the dot.
const VALID_BUFFER_RE = /^\d{0,4}(\.\d{0,2})?$/

function numberToBuffer(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function bufferToNumber(buffer: string): number | null {
  if (buffer === '' || buffer === '.') return null
  const parsed = Number(buffer)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function QuantityInput({ value, unit, onChange, error }: QuantityInputProps) {
  const labelId = useId()
  const errorId = useId()
  // Local string buffer so in-flight states like "1." or "0." survive without
  // round-tripping through Number(). Parent only drives `value` via this
  // component's own onChange, so no prop-sync effect is needed.
  const [buffer, setBuffer] = useState<string>(() => numberToBuffer(value))

  function handleValueChange(raw: string) {
    const normalised = raw.replace(',', '.')
    if (normalised !== '' && !VALID_BUFFER_RE.test(normalised)) return
    setBuffer(normalised)
    onChange({ value: bufferToNumber(normalised), unit })
  }

  function handleUnitChange(raw: string) {
    const nextUnit = isUnitKey(raw) ? raw : null
    onChange({ value, unit: nextUnit })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-text-primary text-[13px] leading-snug font-medium">
        Quantity <span className="text-text-secondary font-normal">(optional)</span>
      </span>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          aria-labelledby={labelId}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          placeholder="—"
          value={buffer}
          onChange={(e) => handleValueChange(e.target.value)}
          className="bg-bg-surface border-border-default text-text-primary focus-visible:outline-accent block min-h-[44px] flex-1 rounded-xl border px-4 text-[16px] leading-relaxed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <select
          aria-labelledby={labelId}
          aria-describedby={error ? errorId : undefined}
          value={unit ?? ''}
          onChange={(e) => handleUnitChange(e.target.value)}
          className="bg-bg-surface border-border-default text-text-primary focus-visible:outline-accent block min-h-[44px] rounded-xl border px-3 text-[16px] leading-relaxed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <option value="">—</option>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {unitLabel(u)}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-[12px] leading-snug">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default QuantityInput

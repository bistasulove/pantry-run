'use client'

// Design system §7.16 — first concrete implementation lands with M17.
//
// Two-way (or N-way) switch used inside /plan to toggle between Reminders
// and Tasks views. Pattern: a flat row of buttons with a sliding accent
// underline that animates between segments. Inactive segments use text
// secondary; active uses primary accent text + a coloured underline that
// slides on selection change. Touch targets meet the 44px minimum via
// vertical padding.

import { useId, useRef, useEffect, useState } from 'react'

export interface SegmentedOption<V extends string> {
  value: V
  label: string
}

interface SegmentedControlProps<V extends string> {
  options: SegmentedOption<V>[]
  value: V
  onChange: (next: V) => void
  ariaLabel: string
}

export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<V>) {
  const groupId = useId()
  const rowRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const active = row.querySelector<HTMLButtonElement>(
      `button[data-segvalue="${CSS.escape(value)}"]`,
    )
    if (!active) return
    const rowBox = row.getBoundingClientRect()
    const box = active.getBoundingClientRect()
    setIndicator({ left: box.left - rowBox.left, width: box.width })
  }, [value, options])

  return (
    <div
      ref={rowRef}
      role="tablist"
      aria-label={ariaLabel}
      className="border-border-default/60 bg-bg-surface relative flex w-full items-stretch border-b"
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            id={`${groupId}-${opt.value}`}
            data-segvalue={opt.value}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`flex h-12 flex-1 items-center justify-center px-3 text-[15px] leading-snug transition-colors duration-150 ${
              selected
                ? 'text-accent font-semibold'
                : 'text-text-secondary hover:text-text-primary font-medium'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
      <span
        aria-hidden
        className="ease-out-expo bg-accent absolute -bottom-px h-[2px] rounded-full transition-[left,width] duration-[250ms]"
        style={
          indicator
            ? { left: `${indicator.left}px`, width: `${indicator.width}px` }
            : { left: 0, width: 0 }
        }
      />
    </div>
  )
}

export default SegmentedControl

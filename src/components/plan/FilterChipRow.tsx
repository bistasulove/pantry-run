'use client'

import { useRef } from 'react'

// Design-system §7.17 Filter Chip. Horizontally-scrolling row of single-select
// pills. Generic over the option key so future surfaces (history filters,
// activity filters) can reuse it without coupling to the task vocabulary.

export interface FilterChipOption<K extends string> {
  key: K
  label: string
  count?: number
}

interface FilterChipRowProps<K extends string> {
  options: FilterChipOption<K>[]
  value: K
  onChange: (next: K) => void
  ariaLabel: string
}

export function FilterChipRow<K extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterChipRowProps<K>) {
  const refs = useRef(new Map<K, HTMLButtonElement | null>())

  // Roving tabindex per the radiogroup pattern: only the active chip is
  // tab-focusable; arrow keys move both focus and selection.
  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, key: K) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const idx = options.findIndex((o) => o.key === key)
    if (idx < 0) return
    const delta = e.key === 'ArrowRight' ? 1 : -1
    const nextIdx = (idx + delta + options.length) % options.length
    const next = options[nextIdx]
    if (!next) return
    onChange(next.key)
    refs.current.get(next.key)?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex scrollbar-none gap-2 overflow-x-auto overscroll-x-contain px-4 py-2 pr-5"
    >
      {options.map((opt) => {
        const selected = opt.key === value
        const label =
          opt.count !== undefined && opt.count > 0 ? `${opt.label} · ${opt.count}` : opt.label
        return (
          <button
            key={opt.key}
            ref={(el) => {
              refs.current.set(opt.key, el)
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!selected) onChange(opt.key)
            }}
            onKeyDown={(e) => onKeyDown(e, opt.key)}
            className={`flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] leading-snug transition-colors duration-150 ${
              selected
                ? 'bg-accent font-semibold text-white'
                : 'bg-bg-surface text-text-secondary border-border-default hover:text-text-primary border font-medium'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default FilterChipRow

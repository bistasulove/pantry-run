'use client'

import { Monitor, Moon, Sun } from 'lucide-react'

import { type ThemeMode, useTheme } from '@/hooks/useTheme'

const OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string; Icon: typeof Sun }> = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

export function ThemeToggle() {
  const { mode, setTheme } = useTheme()

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-text-primary text-[17px] leading-normal font-semibold">
          Appearance
        </h3>
        <p className="text-text-secondary text-[13px] leading-snug">
          Match your device, or force a theme.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Theme"
        className="bg-bg-surface border-border-default grid grid-cols-3 gap-1 rounded-xl border p-1"
      >
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = mode === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-[13px] leading-snug font-medium transition-colors duration-150 ${
                active ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default ThemeToggle

'use client'

import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import type { RecurrencePreset } from '@/lib/recurrence'

export interface ExamplePreset {
  title: string
  preset: RecurrencePreset
  hour: number
  minute: number
  leadMinutes: number
}

export const EXAMPLE_PRESETS: ExamplePreset[] = [
  {
    title: 'Bin night',
    preset: { kind: 'weekly', days: ['TH'] },
    hour: 19,
    minute: 0,
    leadMinutes: 60,
  },
  {
    title: 'Rent',
    preset: { kind: 'monthly', dayOfMonth: 1 },
    hour: 9,
    minute: 0,
    leadMinutes: 0,
  },
]

interface RemindersEmptyProps {
  onCreate: (example?: ExamplePreset) => void
}

export function RemindersEmpty({ onCreate }: RemindersEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <span className="bg-bg-base text-accent flex h-14 w-14 items-center justify-center rounded-full">
        <Bell size={28} strokeWidth={1.5} aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-text-primary text-[20px] leading-snug font-semibold">
          Set a reminder for your household
        </h2>
        <p className="text-text-secondary max-w-xs text-[14px] leading-relaxed">
          Bin night, rent day, your weekly group call — anything recurring. Everyone with
          notifications enabled gets pinged.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {EXAMPLE_PRESETS.map((ex) => (
          <Button key={ex.title} variant="secondary" onClick={() => onCreate(ex)}>
            Try “{ex.title}”
          </Button>
        ))}
        <Button variant="ghost" onClick={() => onCreate(undefined)}>
          Start from scratch
        </Button>
      </div>
    </div>
  )
}

export default RemindersEmpty

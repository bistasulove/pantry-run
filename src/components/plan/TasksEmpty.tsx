'use client'

import { ClipboardList } from 'lucide-react'

import { Button } from '@/components/ui/Button'

export interface TaskExample {
  title: string
  // Days from today; null = no due date. Lets us seed concrete due dates
  // ("today" / "next Friday") without hardcoding ISO strings.
  daysFromNow: number | null
}

export const TASK_EXAMPLES: TaskExample[] = [
  { title: 'Mow the lawn', daysFromNow: 6 },
  { title: 'Empty the dishwasher', daysFromNow: 0 },
  { title: 'Top up the laundry detergent', daysFromNow: null },
]

interface TasksEmptyProps {
  onCreate: (example?: TaskExample) => void
}

export function TasksEmpty({ onCreate }: TasksEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <span className="bg-bg-base text-accent flex h-14 w-14 items-center justify-center rounded-full">
        <ClipboardList size={28} strokeWidth={1.5} aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-text-primary text-[20px] leading-snug font-semibold">
          Share the chores
        </h2>
        <p className="text-text-secondary max-w-xs text-[14px] leading-relaxed">
          Mow the lawn, plumber visit, deep clean before guests. Add a due date and assign it — the
          assignee gets a push.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {TASK_EXAMPLES.map((ex) => (
          <Button key={ex.title} variant="secondary" onClick={() => onCreate(ex)}>
            Try &ldquo;{ex.title}&rdquo;
          </Button>
        ))}
        <Button variant="ghost" onClick={() => onCreate(undefined)}>
          Start from scratch
        </Button>
      </div>
    </div>
  )
}

export default TasksEmpty

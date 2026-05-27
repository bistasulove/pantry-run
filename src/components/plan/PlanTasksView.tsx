'use client'

import { ClipboardList } from 'lucide-react'

// Placeholder for M18 (Household Tasks). The segmented control in /plan
// renders Tasks as a visible segment from M17 onwards so the V2 UI primitive
// (§7.16) is exercised on day one — see plan.md §11.6.1 D5.

export function PlanTasksView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <ClipboardList size={40} strokeWidth={1.5} className="text-text-secondary" aria-hidden />
      <h2 className="text-text-primary text-[20px] leading-snug font-semibold">
        Tasks land in the next update
      </h2>
      <p className="text-text-secondary max-w-xs text-[14px] leading-relaxed">
        Shared chores with due dates and assignees — mow the lawn, water the plants, the works.
        We&apos;re shipping it right after reminders.
      </p>
    </div>
  )
}

export default PlanTasksView

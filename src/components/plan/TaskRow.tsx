'use client'

import { Check, User } from 'lucide-react'

import {
  formatCompletedAgo,
  formatDueLabel,
  isOverdue as isOverdueFn,
} from '@/components/plan/format'
import type { Member } from '@/store/householdStore'
import type { Task } from '@/store/taskStore'

interface TaskRowProps {
  task: Task
  members: Member[]
  // Tap on the checkbox (separate ≥44px tap zone).
  onToggle: () => void
  // Tap on the row body (separate from the checkbox).
  onOpen: () => void
}

export function TaskRow({ task, members, onToggle, onOpen }: TaskRowProps) {
  const assignee = task.assignee_id ? members.find((m) => m.userId === task.assignee_id) : null
  const assigneeLabel = task.assignee_id
    ? assignee?.displayName?.trim() || 'Former member'
    : 'Unassigned'

  const overdue = !task.is_completed && isOverdueFn(task.due_date)
  const dueLabel = task.is_completed ? null : formatDueLabel(task.due_date)
  const completedLabel =
    task.is_completed && task.completed_at ? formatCompletedAgo(task.completed_at) : null

  return (
    <div className="bg-bg-surface border-border-default hover:border-accent/50 flex w-full items-start gap-2 rounded-xl border transition-colors duration-150">
      {/* Checkbox tap zone — explicit 48px square so the row tap below it is
          unambiguously separate. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.is_completed}
        aria-label={
          task.is_completed ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`
        }
        onClick={onToggle}
        className="flex h-12 w-12 shrink-0 items-center justify-center"
      >
        <span
          aria-hidden
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
            task.is_completed
              ? 'bg-accent border-accent text-white'
              : 'border-border-default hover:border-accent'
          }`}
        >
          {task.is_completed ? <Check size={14} strokeWidth={2.5} aria-hidden /> : null}
        </span>
      </button>

      {/* Row body — opens the edit sheet on tap. */}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col gap-0.5 py-3 pr-3 text-left"
      >
        <span
          className={`truncate text-[16px] leading-relaxed font-semibold ${
            task.is_completed ? 'text-text-secondary line-through' : 'text-text-primary'
          }`}
        >
          {task.title}
        </span>
        <span className="text-text-secondary flex items-center gap-1 truncate text-[12px] leading-snug">
          <User size={12} strokeWidth={1.5} aria-hidden />
          <span className="truncate">{assigneeLabel}</span>
          {completedLabel ? <span aria-hidden> · {completedLabel}</span> : null}
        </span>
      </button>

      {dueLabel ? (
        <span
          className={`mt-3 mr-3 shrink-0 rounded-full px-2 py-0.5 text-[12px] leading-snug font-medium ${
            overdue ? 'bg-destructive/10 text-destructive' : 'bg-bg-base text-text-secondary'
          }`}
        >
          {dueLabel}
        </span>
      ) : null}
    </div>
  )
}

export default TaskRow

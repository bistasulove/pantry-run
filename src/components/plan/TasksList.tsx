'use client'

import { useMemo, useState } from 'react'

import { compareOpenTasks, isOverdue } from '@/components/plan/format'
import { TaskRow } from '@/components/plan/TaskRow'
import type { Member } from '@/store/householdStore'
import type { Task } from '@/store/taskStore'

export type TaskFilter = 'all' | 'mine' | 'unassigned' | 'overdue'

interface TasksListProps {
  tasks: Task[]
  filter: TaskFilter
  currentUserId: string | null
  members: Member[]
  onToggle: (id: string) => void
  onOpen: (task: Task) => void
}

function filterPredicate(filter: TaskFilter, task: Task, currentUserId: string | null): boolean {
  if (filter === 'all') return true
  if (filter === 'mine') return task.assignee_id === currentUserId
  if (filter === 'unassigned') return task.assignee_id === null
  // overdue: only open tasks with a past due_date count
  return !task.is_completed && isOverdue(task.due_date)
}

export function TasksList({
  tasks,
  filter,
  currentUserId,
  members,
  onToggle,
  onOpen,
}: TasksListProps) {
  const [completedOpen, setCompletedOpen] = useState(false)

  const { open, completed } = useMemo(() => {
    const open: Task[] = []
    const completed: Task[] = []
    for (const t of tasks) {
      if (!filterPredicate(filter, t, currentUserId)) continue
      if (t.is_completed) completed.push(t)
      else open.push(t)
    }
    open.sort(compareOpenTasks)
    // Completed: most-recently-completed first.
    completed.sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
    return { open, completed }
  }, [tasks, filter, currentUserId])

  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      {open.length === 0 ? (
        <p className="text-text-secondary px-1 py-6 text-center text-[14px] leading-relaxed">
          Nothing here. Try a different filter or add a task.
        </p>
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-text-secondary text-[13px] leading-snug font-semibold tracking-wide uppercase">
            Open
          </h2>
          <ul className="flex flex-col gap-2">
            {open.map((t) => (
              <li key={t.id}>
                <TaskRow
                  task={t}
                  members={members}
                  onToggle={() => onToggle(t.id)}
                  onOpen={() => onOpen(t)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {completed.length > 0 ? (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCompletedOpen((v) => !v)}
            aria-expanded={completedOpen}
            className="text-text-secondary hover:text-text-primary flex items-center gap-2 text-[13px] leading-snug font-semibold tracking-wide uppercase transition-colors duration-150"
          >
            <span>Completed · {completed.length}</span>
            <span aria-hidden className="text-[10px]">
              {completedOpen ? '▾' : '▸'}
            </span>
          </button>
          {completedOpen ? (
            <ul className="flex flex-col gap-2">
              {completed.map((t) => (
                <li key={t.id}>
                  <TaskRow
                    task={t}
                    members={members}
                    onToggle={() => onToggle(t.id)}
                    onOpen={() => onOpen(t)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

export default TasksList

'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { AssigneePicker } from '@/components/plan/AssigneePicker'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { TASK_NOTES_MAX, TASK_TITLE_MAX, useTasks } from '@/hooks/useTasks'
import { useHouseholdStore } from '@/store/householdStore'
import type { Task } from '@/store/taskStore'

export interface TaskSeed {
  title: string
  // ISO YYYY-MM-DD or null.
  dueDate: string | null
}

interface TaskEditSheetProps {
  open: boolean
  onClose: () => void
  // null = create mode (uses `seed` if provided, else default blank draft).
  task: Task | null
  seed?: TaskSeed | null
  onToast: (message: string) => void
}

interface DraftState {
  title: string
  notes: string
  dueDate: string // '' means no due date — date inputs use the empty string for unset
  assigneeId: string | null
}

function draftFromTask(t: Task): DraftState {
  return {
    title: t.title,
    notes: t.notes ?? '',
    dueDate: t.due_date ?? '',
    assigneeId: t.assignee_id,
  }
}

function draftFromSeed(seed?: TaskSeed | null): DraftState {
  if (!seed) return { title: '', notes: '', dueDate: '', assigneeId: null }
  return {
    title: seed.title,
    notes: '',
    dueDate: seed.dueDate ?? '',
    assigneeId: null,
  }
}

export function TaskEditSheet({ open, onClose, task, seed, onToast }: TaskEditSheetProps) {
  const members = useHouseholdStore((s) => s.members)
  const { createTask, updateTask, deleteTask, isPending } = useTasks()

  // Lazy init runs once per mount. The parent resets this component via a
  // `key` prop when switching between create / seed / edit so we never need
  // to re-seed via useEffect.
  const [draft, setDraft] = useState<DraftState>(() =>
    task ? draftFromTask(task) : draftFromSeed(seed),
  )
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    const dueDate = draft.dueDate ? draft.dueDate : null
    if (task) {
      const result = await updateTask(task.id, {
        title: draft.title,
        notes: draft.notes,
        dueDate,
        assigneeId: draft.assigneeId,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onToast('Task saved')
    } else {
      const result = await createTask({
        title: draft.title,
        notes: draft.notes,
        dueDate,
        assigneeId: draft.assigneeId,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onToast('Task created')
    }
    onClose()
  }

  async function handleDelete() {
    if (!task) return
    const result = await deleteTask(task.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onToast('Task deleted')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary text-[13px] leading-snug font-medium">Title</span>
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            maxLength={TASK_TITLE_MAX}
            placeholder="Mow the lawn"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary text-[13px] leading-snug font-medium">
            Due (optional)
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
              className="border-border-default bg-bg-surface text-text-primary h-11 flex-1 rounded-xl border px-3 text-[16px] leading-relaxed"
            />
            {draft.dueDate ? (
              <Button
                variant="ghost"
                onClick={() => setDraft({ ...draft, dueDate: '' })}
                aria-label="Clear due date"
              >
                Clear
              </Button>
            ) : null}
          </div>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-text-secondary text-[13px] leading-snug font-medium">
            Assigned to
          </span>
          <AssigneePicker
            value={draft.assigneeId}
            members={members}
            onChange={(assigneeId) => setDraft({ ...draft, assigneeId })}
            unassignedLabel="Unassigned"
          />
          <span className="text-text-secondary text-[12px] leading-snug">
            The assignee gets a push when you save. Unassigned tasks notify nobody.
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary text-[13px] leading-snug font-medium">
            Notes (optional)
          </span>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            maxLength={TASK_NOTES_MAX}
            rows={2}
            placeholder="Anything to remember"
            className="border-border-default bg-bg-surface text-text-primary resize-none rounded-xl border px-3 py-2 text-[16px] leading-relaxed"
          />
        </label>

        {error ? (
          <p role="alert" className="text-destructive text-[14px] leading-relaxed">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleSave} disabled={isPending} fullWidth>
            {task ? 'Save changes' : 'Create task'}
          </Button>
          {task ? (
            <Button onClick={handleDelete} variant="ghost" disabled={isPending} fullWidth>
              <Trash2 size={16} strokeWidth={1.5} aria-hidden className="mr-1.5" />
              Delete task
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  )
}

export default TaskEditSheet

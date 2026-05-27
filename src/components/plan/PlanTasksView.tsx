'use client'

import { Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { FilterChipRow, type FilterChipOption } from '@/components/plan/FilterChipRow'
import { isOverdue } from '@/components/plan/format'
import { TaskEditSheet, type TaskSeed } from '@/components/plan/TaskEditSheet'
import { TasksEmpty, type TaskExample } from '@/components/plan/TasksEmpty'
import { TasksList, type TaskFilter } from '@/components/plan/TasksList'
import { Button } from '@/components/ui/Button'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { useTasks } from '@/hooks/useTasks'
import { useTaskStore, type Task } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'
import { useHouseholdStore } from '@/store/householdStore'

interface PlanTasksViewProps {
  focusId: string | null
}

function seedFromExample(ex: TaskExample): TaskSeed {
  let dueDate: string | null = null
  if (ex.daysFromNow !== null) {
    const d = new Date()
    d.setDate(d.getDate() + ex.daysFromNow)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dueDate = `${y}-${m}-${day}`
  }
  return { title: ex.title, dueDate }
}

export function PlanTasksView({ focusId }: PlanTasksViewProps) {
  const tasks = useTaskStore((s) => s.items)
  const isLoaded = useTaskStore((s) => s.isLoaded)
  const members = useHouseholdStore((s) => s.members)
  const userId = useUserStore((s) => s.userId)
  const { completeTask, uncompleteTask } = useTasks()

  const [filter, setFilter] = useState<TaskFilter>('all')
  const [editing, setEditing] = useState<Task | null>(null)
  const [seed, setSeed] = useState<TaskSeed | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)
  const handledFocusRef = useRef<string | null>(null)

  // Deep-link from SW notificationclick: /plan?tab=tasks&focus=<id>.
  useEffect(() => {
    if (!focusId || !isLoaded) return
    if (handledFocusRef.current === focusId) return
    const target = tasks.find((t) => t.id === focusId)
    if (target) {
      handledFocusRef.current = focusId
      // External signal (URL ?focus) → React state. Same exemption as in
      // PlanRemindersView — runs at most once per distinct focusId per session.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditing(target)
      setSeed(null)
      setSheetOpen(true)
    }
  }, [focusId, isLoaded, tasks])

  // Derived counts for the filter chips. Match TasksList's predicate exactly
  // so the chip count and the rendered list agree at all times.
  const counts = useMemo(() => {
    let mine = 0
    let overdue = 0
    for (const t of tasks) {
      if (t.assignee_id === userId && !t.is_completed) mine++
      if (!t.is_completed && isOverdue(t.due_date)) overdue++
    }
    return { mine, overdue }
  }, [tasks, userId])

  const filterOptions: FilterChipOption<TaskFilter>[] = [
    { key: 'all', label: 'All' },
    { key: 'mine', label: 'Mine', count: counts.mine },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
  ]

  function openCreate(example?: TaskExample) {
    setEditing(null)
    setSeed(example ? seedFromExample(example) : null)
    setSheetOpen(true)
  }

  function openExisting(t: Task) {
    setEditing(t)
    setSeed(null)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    // Defer wiping so the sheet's exit animation has data to render.
    setTimeout(() => {
      setEditing(null)
      setSeed(null)
    }, 350)
  }

  function handleToggle(id: string) {
    const t = tasks.find((x) => x.id === id)
    if (!t) return
    void (t.is_completed ? uncompleteTask(id) : completeTask(id))
  }

  const showEmpty = isLoaded && tasks.length === 0

  return (
    <div className="relative flex h-full flex-col">
      {showEmpty ? (
        <TasksEmpty onCreate={openCreate} />
      ) : (
        <>
          <FilterChipRow
            options={filterOptions}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filter tasks"
          />
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-24">
            {!isLoaded ? (
              <p className="text-text-secondary py-6 text-center text-[14px] leading-relaxed">
                Loading…
              </p>
            ) : (
              <TasksList
                tasks={tasks}
                filter={filter}
                currentUserId={userId}
                members={members}
                onToggle={handleToggle}
                onOpen={openExisting}
              />
            )}
          </div>
        </>
      )}

      {!showEmpty ? (
        <div
          className="pointer-events-none absolute right-4 bottom-4 left-4 flex justify-end"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Button
            onClick={() => openCreate()}
            aria-label="New task"
            className="pointer-events-auto flex h-12 items-center gap-2 rounded-full px-5 shadow-lg"
          >
            <Plus size={18} strokeWidth={1.5} aria-hidden />
            New
          </Button>
        </div>
      ) : null}

      <TaskEditSheet
        key={editing ? `edit:${editing.id}` : seed ? `seed:${seed.title}` : 'create'}
        open={sheetOpen}
        onClose={closeSheet}
        task={editing}
        seed={seed}
        onToast={(message) => setToast({ message })}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

export default PlanTasksView

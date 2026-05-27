'use client'

import { useCallback, useState } from 'react'

import type { Database } from '@/lib/database.types'
import { enqueue, queueLength, type QueuedOp } from '@/lib/offline/queue'
import { notifyTaskAssignment } from '@/lib/push/client'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'
import { useSyncStore } from '@/store/syncStore'
import { useTaskStore, type Task } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'

type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export const TASK_TITLE_MAX = 120
export const TASK_NOTES_MAX = 500

export type CrudResult<T = void> = { ok: true; value?: T } | { ok: false; error: string }

export interface TaskDraft {
  title: string
  notes: string | null
  assigneeId: string | null
  // ISO YYYY-MM-DD (date-only). Plan.md M18 — tasks are all-day, no time.
  dueDate: string | null
}

export interface TaskPatch {
  title?: string
  notes?: string | null
  assigneeId?: string | null
  dueDate?: string | null
}

function validateTitle(raw: string): { ok: true; title: string } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, error: 'Give the task a title.' }
  if (trimmed.length > TASK_TITLE_MAX) {
    return { ok: false, error: `Keep the title under ${TASK_TITLE_MAX} characters.` }
  }
  return { ok: true, title: trimmed }
}

function normaliseNotes(raw: string | null | undefined):
  | {
      ok: true
      notes: string | null
    }
  | { ok: false; error: string } {
  const trimmed = (raw ?? '').trim()
  if (trimmed.length > TASK_NOTES_MAX) {
    return { ok: false, error: `Keep notes under ${TASK_NOTES_MAX} characters.` }
  }
  return { ok: true, notes: trimmed ? trimmed : null }
}

function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (error instanceof TypeError) return true
  if (
    typeof error === 'object' &&
    error !== null &&
    !('code' in error) &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    /failed to fetch|network|load failed/i.test((error as { message: string }).message)
  ) {
    return true
  }
  return false
}

async function refreshQueuedCount(): Promise<void> {
  const n = await queueLength()
  useSyncStore.getState().setQueuedCount(n)
}

async function pushToQueue(op: QueuedOp): Promise<void> {
  await enqueue(op)
  await refreshQueuedCount()
}

// Tasks CRUD over public.tasks. Unlike reminders (M17, online-only), tasks
// support the offline queue — completing a chore while on the bus shouldn't
// require waiting for sync. Mirror of useList's queueing pattern.
//
// Assignment push: fired fire-and-forget after a successful create/update
// where assigneeId is non-null AND (for update) actually changed. Offline
// queue entries carry a notifyAssignee flag so the executor can fire the
// same push when they drain.

export function useTasks() {
  const [isPending, setIsPending] = useState(false)

  const createTask = useCallback(async (draft: TaskDraft): Promise<CrudResult<Task>> => {
    const householdId = useHouseholdStore.getState().householdId
    if (!householdId) return { ok: false, error: 'No household selected.' }
    const userId = useUserStore.getState().userId

    const titleResult = validateTitle(draft.title)
    if (!titleResult.ok) return titleResult
    const notesResult = normaliseNotes(draft.notes)
    if (!notesResult.ok) return notesResult

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const optimistic: Task = {
      id,
      household_id: householdId,
      title: titleResult.title,
      notes: notesResult.notes,
      assignee_id: draft.assigneeId,
      due_date: draft.dueDate,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    }

    useTaskStore.getState().addOptimistic(optimistic)
    setIsPending(true)
    useSyncStore.getState().beginWrite()
    let succeeded = false
    try {
      const supabase = createClient()
      const insert: TaskInsert = {
        id,
        household_id: householdId,
        title: titleResult.title,
        notes: notesResult.notes,
        assignee_id: draft.assigneeId,
        due_date: draft.dueDate,
        created_by: userId ?? undefined,
      }
      const { error } = await supabase.from('tasks').insert(insert)
      if (error) {
        if (isNetworkError(error)) {
          await pushToQueue({ kind: 'task_create', row: optimistic })
          return { ok: true, value: optimistic }
        }
        console.error('[useTasks] create failed', error)
        useTaskStore.getState().removeOptimistic(id)
        return { ok: false, error: "Couldn't create the task. Try again." }
      }
      succeeded = true
      if (draft.assigneeId) void notifyTaskAssignment(id)
      return { ok: true, value: optimistic }
    } catch (error) {
      if (isNetworkError(error)) {
        await pushToQueue({ kind: 'task_create', row: optimistic })
        return { ok: true, value: optimistic }
      }
      useTaskStore.getState().removeOptimistic(id)
      return { ok: false, error: "Couldn't create the task. Try again." }
    } finally {
      useSyncStore.getState().endWrite(succeeded)
      setIsPending(false)
    }
  }, [])

  const updateTask = useCallback(async (id: string, patch: TaskPatch): Promise<CrudResult> => {
    const current = useTaskStore.getState().items.find((t) => t.id === id)
    if (!current) return { ok: false, error: 'Task not found.' }

    const update: TaskUpdate = {}
    const optimisticPatch: Partial<Task> = {}

    if (patch.title !== undefined) {
      const v = validateTitle(patch.title)
      if (!v.ok) return v
      update.title = v.title
      optimisticPatch.title = v.title
    }
    if (patch.notes !== undefined) {
      const n = normaliseNotes(patch.notes)
      if (!n.ok) return n
      update.notes = n.notes
      optimisticPatch.notes = n.notes
    }
    if (patch.assigneeId !== undefined) {
      update.assignee_id = patch.assigneeId
      optimisticPatch.assignee_id = patch.assigneeId
    }
    if (patch.dueDate !== undefined) {
      update.due_date = patch.dueDate
      optimisticPatch.due_date = patch.dueDate
    }
    if (Object.keys(update).length === 0) return { ok: true }

    // Fire the assignment push only when the assignee actually changed to a
    // new non-null user. Same-user no-op reassigns (e.g. user edits title
    // without touching the assignee field) skip the push entirely.
    const notifyAssignee =
      patch.assigneeId !== undefined &&
      patch.assigneeId !== null &&
      patch.assigneeId !== current.assignee_id

    useTaskStore.getState().updateOptimistic(id, optimisticPatch)
    setIsPending(true)
    useSyncStore.getState().beginWrite()
    let succeeded = false
    try {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').update(update).eq('id', id)
      if (error) {
        if (isNetworkError(error)) {
          await pushToQueue({
            kind: 'task_update',
            id,
            patch: update,
            notifyAssignee: notifyAssignee || undefined,
          })
          return { ok: true }
        }
        console.error('[useTasks] update failed', error)
        // Roll back to the pre-patch snapshot.
        useTaskStore.getState().updateOptimistic(id, {
          title: current.title,
          notes: current.notes,
          assignee_id: current.assignee_id,
          due_date: current.due_date,
        })
        return { ok: false, error: "Couldn't update the task. Try again." }
      }
      succeeded = true
      if (notifyAssignee) void notifyTaskAssignment(id)
      return { ok: true }
    } catch (error) {
      if (isNetworkError(error)) {
        await pushToQueue({
          kind: 'task_update',
          id,
          patch: update,
          notifyAssignee: notifyAssignee || undefined,
        })
        return { ok: true }
      }
      useTaskStore.getState().updateOptimistic(id, {
        title: current.title,
        notes: current.notes,
        assignee_id: current.assignee_id,
        due_date: current.due_date,
      })
      return { ok: false, error: "Couldn't update the task. Try again." }
    } finally {
      useSyncStore.getState().endWrite(succeeded)
      setIsPending(false)
    }
  }, [])

  // Complete + uncomplete are split from updateTask because they're hot paths
  // (one-tap from the row) and their optimistic patch shape is fixed. Avoids
  // an `is_completed` field in TaskPatch that callers could misuse.
  const setCompletion = useCallback(async (id: string, completed: boolean): Promise<CrudResult> => {
    const current = useTaskStore.getState().items.find((t) => t.id === id)
    if (!current) return { ok: false, error: 'Task not found.' }
    if (current.is_completed === completed) return { ok: true }

    const userId = useUserStore.getState().userId
    const now = new Date().toISOString()

    const optimisticPatch: Partial<Task> = completed
      ? { is_completed: true, completed_at: now, completed_by: userId }
      : { is_completed: false, completed_at: null, completed_by: null }
    const update: TaskUpdate = optimisticPatch

    useTaskStore.getState().updateOptimistic(id, optimisticPatch)
    useSyncStore.getState().beginWrite()
    let succeeded = false
    try {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').update(update).eq('id', id)
      if (error) {
        if (isNetworkError(error)) {
          await pushToQueue({ kind: 'task_update', id, patch: update })
          return { ok: true }
        }
        console.error('[useTasks] completion toggle failed', error)
        useTaskStore.getState().updateOptimistic(id, {
          is_completed: current.is_completed,
          completed_at: current.completed_at,
          completed_by: current.completed_by,
        })
        return { ok: false, error: "Couldn't update the task. Try again." }
      }
      succeeded = true
      return { ok: true }
    } catch (error) {
      if (isNetworkError(error)) {
        await pushToQueue({ kind: 'task_update', id, patch: update })
        return { ok: true }
      }
      useTaskStore.getState().updateOptimistic(id, {
        is_completed: current.is_completed,
        completed_at: current.completed_at,
        completed_by: current.completed_by,
      })
      return { ok: false, error: "Couldn't update the task. Try again." }
    } finally {
      useSyncStore.getState().endWrite(succeeded)
    }
  }, [])

  const completeTask = useCallback((id: string) => setCompletion(id, true), [setCompletion])
  const uncompleteTask = useCallback((id: string) => setCompletion(id, false), [setCompletion])

  const deleteTask = useCallback(async (id: string): Promise<CrudResult> => {
    const current = useTaskStore.getState().items.find((t) => t.id === id)
    if (!current) return { ok: true }

    useTaskStore.getState().removeOptimistic(id)
    useSyncStore.getState().beginWrite()
    let succeeded = false
    try {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) {
        if (isNetworkError(error)) {
          await pushToQueue({ kind: 'task_delete', id })
          return { ok: true }
        }
        console.error('[useTasks] delete failed', error)
        useTaskStore.getState().addOptimistic(current)
        return { ok: false, error: "Couldn't delete the task. Try again." }
      }
      succeeded = true
      return { ok: true }
    } catch (error) {
      if (isNetworkError(error)) {
        await pushToQueue({ kind: 'task_delete', id })
        return { ok: true }
      }
      useTaskStore.getState().addOptimistic(current)
      return { ok: false, error: "Couldn't delete the task. Try again." }
    } finally {
      useSyncStore.getState().endWrite(succeeded)
    }
  }, [])

  return { createTask, updateTask, completeTask, uncompleteTask, deleteTask, isPending }
}

export type { Task }

'use client'

import { useCallback, useState } from 'react'

import type { Database } from '@/lib/database.types'
import { nextFire } from '@/lib/recurrence'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'
import { useReminderStore, type Reminder } from '@/store/reminderStore'

type ReminderInsert = Database['public']['Tables']['reminders']['Insert']
type ReminderUpdate = Database['public']['Tables']['reminders']['Update']

export const REMINDER_TITLE_MAX = 120
export const REMINDER_NOTES_MAX = 500

export type CrudResult = { ok: true } | { ok: false; error: string }

function requireOnline(action: 'create' | 'update' | 'delete'): string | null {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) return null
  return `Connect to the internet to ${action} reminders.`
}

function validateTitle(raw: string): { ok: true; title: string } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, error: 'Give the reminder a title.' }
  if (trimmed.length > REMINDER_TITLE_MAX) {
    return { ok: false, error: `Keep the title under ${REMINDER_TITLE_MAX} characters.` }
  }
  return { ok: true, title: trimmed }
}

export interface ReminderDraft {
  title: string
  notes: string | null
  recurrence: string | null
  firstFireAt: Date
  leadMinutes: number
  assigneeId: string | null
}

// CRUD over public.reminders. Online-only by design — schedule writes are
// rare enough that queueing buys little, and a queued recurrence-rule update
// that lands after the cron has already advanced next_fire_at would create
// hard-to-explain "did my edit save?" UX.

export function useReminders() {
  const [isPending, setIsPending] = useState(false)

  const createReminder = useCallback(async (draft: ReminderDraft): Promise<CrudResult> => {
    const offline = requireOnline('create')
    if (offline) return { ok: false, error: offline }

    const householdId = useHouseholdStore.getState().householdId
    if (!householdId) return { ok: false, error: 'No household selected.' }

    const validated = validateTitle(draft.title)
    if (!validated.ok) return validated

    const trimmedNotes = (draft.notes ?? '').trim()
    if (trimmedNotes.length > REMINDER_NOTES_MAX) {
      return { ok: false, error: `Keep notes under ${REMINDER_NOTES_MAX} characters.` }
    }

    setIsPending(true)
    const supabase = createClient()
    try {
      const insert: ReminderInsert = {
        household_id: householdId,
        title: validated.title,
        notes: trimmedNotes ? trimmedNotes : null,
        recurrence: draft.recurrence,
        next_fire_at: draft.firstFireAt.toISOString(),
        lead_minutes: draft.leadMinutes,
        assignee_id: draft.assigneeId,
      }
      const { data, error } = await supabase.from('reminders').insert(insert).select().single()
      if (error || !data) {
        console.error('[useReminders] create failed', error)
        return { ok: false, error: "Couldn't create the reminder. Try again." }
      }
      useReminderStore.getState().addOptimistic(data)
      return { ok: true }
    } finally {
      setIsPending(false)
    }
  }, [])

  const updateReminder = useCallback(
    async (
      id: string,
      patch: {
        title?: string
        notes?: string | null
        recurrence?: string | null
        nextFireAt?: Date
        leadMinutes?: number
        assigneeId?: string | null
        isActive?: boolean
      },
      tz: string,
    ): Promise<CrudResult> => {
      const offline = requireOnline('update')
      if (offline) return { ok: false, error: offline }

      const current = useReminderStore.getState().items.find((r) => r.id === id)
      if (!current) return { ok: false, error: 'Reminder not found.' }

      const update: ReminderUpdate = {}
      if (patch.title !== undefined) {
        const v = validateTitle(patch.title)
        if (!v.ok) return v
        update.title = v.title
      }
      if (patch.notes !== undefined) {
        const trimmed = (patch.notes ?? '').trim()
        if (trimmed.length > REMINDER_NOTES_MAX) {
          return { ok: false, error: `Keep notes under ${REMINDER_NOTES_MAX} characters.` }
        }
        update.notes = trimmed ? trimmed : null
      }
      if (patch.recurrence !== undefined) update.recurrence = patch.recurrence
      if (patch.leadMinutes !== undefined) update.lead_minutes = patch.leadMinutes
      if (patch.assigneeId !== undefined) update.assignee_id = patch.assigneeId
      if (patch.isActive !== undefined) update.is_active = patch.isActive

      // If recurrence changed without an explicit nextFireAt, re-anchor at now
      // so the new rule fires at its next valid local occurrence (not at the
      // old next_fire_at, which was scheduled by the prior rule).
      let nextFireAt: Date | undefined = patch.nextFireAt
      if (patch.recurrence !== undefined && nextFireAt === undefined) {
        const fromNow = nextFire(patch.recurrence ?? null, new Date(), tz)
        if (fromNow) nextFireAt = fromNow
      }
      if (nextFireAt) update.next_fire_at = nextFireAt.toISOString()

      setIsPending(true)
      const supabase = createClient()
      try {
        const { data, error } = await supabase
          .from('reminders')
          .update(update)
          .eq('id', id)
          .select()
          .single()
        if (error || !data) {
          console.error('[useReminders] update failed', error)
          return { ok: false, error: "Couldn't update the reminder. Try again." }
        }
        useReminderStore.getState().updateOptimistic(id, data)
        return { ok: true }
      } finally {
        setIsPending(false)
      }
    },
    [],
  )

  const deleteReminder = useCallback(async (id: string): Promise<CrudResult> => {
    const offline = requireOnline('delete')
    if (offline) return { ok: false, error: offline }

    setIsPending(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.from('reminders').delete().eq('id', id)
      if (error) {
        console.error('[useReminders] delete failed', error)
        return { ok: false, error: "Couldn't delete the reminder. Try again." }
      }
      useReminderStore.getState().removeOptimistic(id)
      return { ok: true }
    } finally {
      setIsPending(false)
    }
  }, [])

  return { createReminder, updateReminder, deleteReminder, isPending } satisfies {
    createReminder: (draft: ReminderDraft) => Promise<CrudResult>
    updateReminder: typeof updateReminder
    deleteReminder: (id: string) => Promise<CrudResult>
    isPending: boolean
  }
}

export type { Reminder }

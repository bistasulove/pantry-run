'use client'

import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'
import { useTaskStore, type Task } from '@/store/taskStore'

// Loads the active household's tasks and keeps the cache live via a realtime
// subscription. Mounted once in AppShell so the Plan tab and the BottomNav
// badge can read from a shared store without re-fetching. Renders nothing.
//
// Three event paths:
//   INSERT — another member created a task. Add to store.
//   UPDATE — another member edited (completion, assignee, etc.). Apply patch.
//            Realtime will also echo our own optimistic updates; addOptimistic
//            dedupes on id and updateOptimistic is idempotent against a row
//            already in that state.
//   DELETE — remove from store.
//
// Completion cutoff (M18 D8): the initial fetch caps the Completed bucket at
// 30 days. Tasks completed > 30 days ago are dropped from the cache, not just
// hidden — keeps the store bounded on long-lived households. New realtime
// UPDATE events for "ancient" rows are still applied (an old task being
// re-opened comes back into view via assignee_id / is_completed = false).
//
// Re-fetch on SUBSCRIBED + `online` (per feedback_supabase_realtime_reconnect)
// keeps the cache honest across brief network blips.

const COMPLETED_CUTOFF_DAYS = 30

export function TasksRealtime() {
  const householdId = useHouseholdStore((s) => s.householdId)

  useEffect(() => {
    if (!householdId) {
      useTaskStore.getState().clear()
      return
    }
    const activeHouseholdId = householdId

    let cancelled = false
    const supabase = createClient()

    async function fetchAll() {
      const cutoff = new Date(Date.now() - COMPLETED_CUTOFF_DAYS * 24 * 60 * 60 * 1000)
      const cutoffIso = cutoff.toISOString()

      // One round-trip with an OR predicate: all open tasks + completed
      // tasks whose completed_at is within the cutoff.
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('household_id', activeHouseholdId)
        .or(`is_completed.eq.false,completed_at.gte.${cutoffIso}`)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        console.warn('[TasksRealtime] load failed', error)
        return
      }
      useTaskStore.getState().setAll(data ?? [])
    }

    void fetchAll()

    const channel = supabase
      .channel(`tasks:${activeHouseholdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `household_id=eq.${activeHouseholdId}`,
        },
        (payload) => {
          const store = useTaskStore.getState()
          if (payload.eventType === 'INSERT') {
            store.addOptimistic(payload.new as Task)
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Task
            // If a previously-cached row was just completed and is now older
            // than the cutoff (impossible immediately, but a defensive guard
            // for clock skew), keep it in the store — the user is actively
            // looking at it. Next mount's fetchAll will reapply the cutoff.
            store.updateOptimistic(row.id, row)
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as { id?: string }
            if (row.id) store.removeOptimistic(row.id)
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void fetchAll()
      })

    function onOnline() {
      void fetchAll()
    }
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      window.removeEventListener('online', onOnline)
      void supabase.removeChannel(channel)
    }
  }, [householdId])

  return null
}

export default TasksRealtime

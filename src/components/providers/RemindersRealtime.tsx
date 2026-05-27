'use client'

import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'
import { useReminderStore, type Reminder } from '@/store/reminderStore'

// Loads the active household's reminders and keeps the cache live via a
// realtime subscription. Mounted once in AppShell so the Plan tab can render
// without re-fetching. Renders nothing.
//
// Three event paths:
//   INSERT — another member created a reminder. Add to store.
//   UPDATE — another member edited, or fire_due_reminders advanced
//            next_fire_at / set is_active=false. Apply patch.
//   DELETE — remove from store.
//
// We re-fetch the full list on SUBSCRIBED so reconnects after a brief blip
// catch up cleanly (see feedback_supabase_realtime_reconnect memory). The
// `online` window event covers blips where the socket survives but ticks
// were missed.

export function RemindersRealtime() {
  const householdId = useHouseholdStore((s) => s.householdId)

  useEffect(() => {
    if (!householdId) {
      useReminderStore.getState().clear()
      return
    }
    const activeHouseholdId = householdId

    let cancelled = false
    const supabase = createClient()

    async function fetchAll() {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('household_id', activeHouseholdId)
        .order('next_fire_at', { ascending: true })
      if (cancelled) return
      if (error) {
        console.warn('[RemindersRealtime] load failed', error)
        return
      }
      useReminderStore.getState().setAll(data ?? [])
    }

    void fetchAll()

    const channel = supabase
      .channel(`reminders:${activeHouseholdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `household_id=eq.${activeHouseholdId}`,
        },
        (payload) => {
          const store = useReminderStore.getState()
          if (payload.eventType === 'INSERT') {
            store.addOptimistic(payload.new as Reminder)
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Reminder
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

export default RemindersRealtime

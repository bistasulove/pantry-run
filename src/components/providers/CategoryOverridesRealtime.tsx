'use client'

import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useCategoryOverridesStore } from '@/store/categoryOverridesStore'
import { useHouseholdStore } from '@/store/householdStore'

// Loads household_category_overrides for the active household and keeps the
// local cache live via a realtime subscription. Mounted once in AppShell so
// addItem can consult the cache synchronously — see categoryOverridesStore.
//
// Renders nothing. Cross-device updates (one member corrects a category, the
// other member's device sees it within ms) are part of the contract for
// "Your pick is remembered for this name across the household."
export function CategoryOverridesRealtime() {
  const householdId = useHouseholdStore((s) => s.householdId)

  useEffect(() => {
    if (!householdId) {
      useCategoryOverridesStore.getState().clear()
      return
    }

    let cancelled = false
    const supabase = createClient()

    void (async () => {
      const { data, error } = await supabase
        .from('household_category_overrides')
        .select('normalised_name, category')
        .eq('household_id', householdId)
      if (cancelled) return
      if (error) {
        console.warn('[CategoryOverridesRealtime] load failed', error)
        return
      }
      useCategoryOverridesStore.getState().setAll(data ?? [])
    })()

    const channel = supabase
      .channel(`overrides:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_category_overrides',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const store = useCategoryOverridesStore.getState()
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { normalised_name?: string }
            if (old.normalised_name) store.remove(old.normalised_name)
            return
          }
          const row = payload.new as { normalised_name?: string; category?: string }
          if (typeof row.normalised_name === 'string' && typeof row.category === 'string') {
            store.apply(row.normalised_name, row.category)
          }
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [householdId])

  return null
}

export default CategoryOverridesRealtime

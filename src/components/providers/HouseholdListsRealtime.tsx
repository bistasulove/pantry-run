'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'

// Subscribes to public.lists for the current household and fires
// router.refresh() on any change. The (app) layout re-fetches the lists set
// and feeds it back through HouseholdHydrator into the store, so the list
// switcher reflects creates/renames/deletes from sibling devices live.
//
// Mirrors HouseholdMembersRealtime — list mutations are rare admin actions,
// so the cost of a full layout re-fetch is negligible and the simpler
// "subscribe-then-refetch" path matches the existing pattern.
export function HouseholdListsRealtime() {
  const householdId = useHouseholdStore((s) => s.householdId)
  const router = useRouter()

  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`lists:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [householdId, router])

  return null
}

export default HouseholdListsRealtime

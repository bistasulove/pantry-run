'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'

// Subscribes to household_members for the current household and fires
// router.refresh() on any change. The (app) layout re-fetches and feeds the
// fresh members list back through HouseholdHydrator into the store, so /household
// updates live when an owner removes someone, when a new member joins, or when
// any member renames themselves.
//
// If the change removes the current user (owner removed them, or a sibling
// tab triggered a leave), the (app) layout's membership check fails on
// re-fetch and routes them to /welcome.
export function HouseholdMembersRealtime() {
  const householdId = useHouseholdStore((s) => s.householdId)
  const router = useRouter()

  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`members:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members',
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

export default HouseholdMembersRealtime

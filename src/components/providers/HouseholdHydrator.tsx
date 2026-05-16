'use client'

import { useEffect, useState } from 'react'

import { useHouseholdStore, type Member } from '@/store/householdStore'

interface HouseholdHydratorProps {
  householdId: string
  name: string
  listId: string
  members: Member[]
  children: React.ReactNode
}

function sameMembers(a: Member[], b: Member[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].userId !== b[i].userId ||
      a[i].role !== b[i].role ||
      a[i].displayName !== b[i].displayName ||
      a[i].joinedAt !== b[i].joinedAt
    ) {
      return false
    }
  }
  return true
}

export function HouseholdHydrator({
  householdId,
  name,
  listId,
  members,
  children,
}: HouseholdHydratorProps) {
  // Seed synchronously on first render so children read the hydrated state.
  useState(() => {
    useHouseholdStore.getState().setHousehold({ householdId, name, listId, members })
    return null
  })

  // Re-sync when the server re-fetches (e.g., after router.refresh post-mutation
  // or navigation under the same layout). The (app) layout persists across
  // child-route navigation, so without this the store would stay frozen at
  // first-mount values even after fresh data arrived. Equality check avoids
  // notifying subscribers when the data is actually the same.
  useEffect(() => {
    const state = useHouseholdStore.getState()
    if (
      state.householdId === householdId &&
      state.name === name &&
      state.listId === listId &&
      sameMembers(state.members, members)
    ) {
      return
    }
    state.setHousehold({ householdId, name, listId, members })
  }, [householdId, name, listId, members])

  return <>{children}</>
}

export default HouseholdHydrator

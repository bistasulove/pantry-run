'use client'

import { useEffect, useState } from 'react'

import { useHouseholdStore, type Member } from '@/store/householdStore'
import { useUserStore } from '@/store/userStore'

interface HouseholdHydratorProps {
  householdId: string
  name: string
  listId: string
  members: Member[]
  // Server-side user id from the (app) layout — known synchronously, unlike
  // userStore.userId which only populates after SessionProvider's bootstrap
  // effect runs. Used to find this user's own row and seed displayName.
  currentUserId: string
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
  currentUserId,
  children,
}: HouseholdHydratorProps) {
  // Seed synchronously on first render so children read the hydrated state.
  // Also seed userStore.displayName from the user's own member row — without
  // this, returning users have displayName=null until they visit Settings,
  // which silently breaks presence broadcasts.
  useState(() => {
    useHouseholdStore.getState().setHousehold({ householdId, name, listId, members })
    const self = members.find((m) => m.userId === currentUserId)
    if (self) {
      useUserStore.getState().setDisplayName(self.displayName)
    }
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
    const self = members.find((m) => m.userId === currentUserId)
    if (self) {
      useUserStore.getState().setDisplayName(self.displayName)
    }
  }, [householdId, name, listId, members, currentUserId])

  return <>{children}</>
}

export default HouseholdHydrator

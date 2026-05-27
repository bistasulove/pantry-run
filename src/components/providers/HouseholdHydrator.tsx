'use client'

import { useEffect, useState } from 'react'

import { useHouseholdStore, type ListSummary, type Member } from '@/store/householdStore'
import { useUserStore } from '@/store/userStore'

interface HouseholdHydratorProps {
  householdId: string
  name: string
  timezone: string
  members: Member[]
  lists: ListSummary[]
  activeListId: string
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

function sameLists(a: ListSummary[], b: ListSummary[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].name !== b[i].name ||
      a[i].createdAt !== b[i].createdAt ||
      a[i].createdBy !== b[i].createdBy
    ) {
      return false
    }
  }
  return true
}

export function HouseholdHydrator({
  householdId,
  name,
  timezone,
  members,
  lists,
  activeListId,
  currentUserId,
  children,
}: HouseholdHydratorProps) {
  // Seed synchronously on first render so children read the hydrated state.
  // Also seed userStore.displayName from the user's own member row — without
  // this, returning users have displayName=null until they visit Settings,
  // which silently breaks presence broadcasts.
  useState(() => {
    useHouseholdStore
      .getState()
      .setHousehold({ householdId, name, timezone, members, lists, activeListId })
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
  //
  // NOTE on activeListId: the client realtime path (useLists + useActiveList)
  // is the source of truth once we're mounted — when the user switches lists,
  // the store changes immediately and the cookie is updated, but the server
  // layout doesn't re-run mid-session. So we only adopt the server's
  // activeListId when the rest of the snapshot actually changed (which means
  // either first mount or a real router.refresh). Skipping this would
  // ping-pong the active list on every parent re-render.
  useEffect(() => {
    const state = useHouseholdStore.getState()
    if (
      state.householdId === householdId &&
      state.name === name &&
      state.timezone === timezone &&
      sameMembers(state.members, members) &&
      sameLists(state.lists, lists)
    ) {
      return
    }
    // Prefer the in-store activeListId if it still points at a real list
    // (the user may have switched after first mount); otherwise fall back to
    // the server's pick.
    const preservedActiveId =
      state.activeListId && lists.some((l) => l.id === state.activeListId)
        ? state.activeListId
        : activeListId
    state.setHousehold({
      householdId,
      name,
      timezone,
      members,
      lists,
      activeListId: preservedActiveId,
    })
    const self = members.find((m) => m.userId === currentUserId)
    if (self) {
      useUserStore.getState().setDisplayName(self.displayName)
    }
  }, [householdId, name, timezone, members, lists, activeListId, currentUserId])

  return <>{children}</>
}

export default HouseholdHydrator

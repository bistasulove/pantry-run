'use client'

import { useCallback } from 'react'

import { ACTIVE_LIST_COOKIE, ACTIVE_LIST_COOKIE_MAX_AGE_SECONDS } from '@/lib/active-list-cookie'
import { setCookie } from '@/lib/cookies'
import { useHouseholdStore, type ListSummary } from '@/store/householdStore'

export interface UseActiveListApi {
  lists: ListSummary[]
  activeListId: string | null
  activeList: ListSummary | null
  setActiveList: (listId: string) => void
}

export function useActiveList(): UseActiveListApi {
  const lists = useHouseholdStore((s) => s.lists)
  const activeListId = useHouseholdStore((s) => s.activeListId)

  const setActiveList = useCallback((listId: string) => {
    // Update the store first so the UI rescopes immediately; cookie is just
    // for the next cold-load to skip the flash-of-default-list. If the cookie
    // write fails (e.g., disabled cookies) the UI still works in-session.
    useHouseholdStore.getState().setActiveListId(listId)
    setCookie(ACTIVE_LIST_COOKIE, listId, {
      maxAgeSeconds: ACTIVE_LIST_COOKIE_MAX_AGE_SECONDS,
    })
  }, [])

  const activeList = activeListId ? (lists.find((l) => l.id === activeListId) ?? null) : null

  return { lists, activeListId, activeList, setActiveList }
}

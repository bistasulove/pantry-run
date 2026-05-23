'use client'

import { useCallback, useState } from 'react'

import { ACTIVE_LIST_COOKIE, ACTIVE_LIST_COOKIE_MAX_AGE_SECONDS } from '@/lib/active-list-cookie'
import { setCookie } from '@/lib/cookies'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'

export const LIST_NAME_MAX_LENGTH = 50

export type CrudResult = { ok: true } | { ok: false; error: string }

function requireOnline(action: 'create' | 'rename' | 'delete'): string | null {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) return null
  const verb = action === 'create' ? 'create' : action === 'rename' ? 'rename' : 'delete'
  return `Connect to the internet to ${verb} a list.`
}

function validateName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, error: 'Give the list a name.' }
  if (trimmed.length > LIST_NAME_MAX_LENGTH) {
    return { ok: false, error: `Keep the name under ${LIST_NAME_MAX_LENGTH} characters.` }
  }
  return { ok: true, name: trimmed }
}

// CRUD over public.lists. Online-only by design — list management is rare and
// administrative, queuing it would mean keeping authoritative list metadata in
// IndexedDB and reconciling on reconnect with no clear UX win. Same posture as
// the M9 account upgrade.
//
// All mutations rely on the realtime subscription in HouseholdListsRealtime
// to push fresh state back into the store via router.refresh(). For the
// device that initiated the change we also update the store directly so the
// UI reacts before the round-trip finishes.
export function useListCrud() {
  const [isPending, setIsPending] = useState(false)

  const createList = useCallback(async (name: string): Promise<CrudResult> => {
    const offline = requireOnline('create')
    if (offline) return { ok: false, error: offline }

    const householdId = useHouseholdStore.getState().householdId
    if (!householdId) return { ok: false, error: 'No household selected.' }

    const validated = validateName(name)
    if (!validated.ok) return validated

    setIsPending(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('lists')
        .insert({ household_id: householdId, name: validated.name })
        .select('id, name, created_at, created_by')
        .single()
      if (error || !data) {
        console.error('[useListCrud] create failed', error)
        return { ok: false, error: "Couldn't create the list. Try again." }
      }
      const store = useHouseholdStore.getState()
      store.addList({
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
        createdBy: data.created_by,
      })
      store.setActiveListId(data.id)
      setCookie(ACTIVE_LIST_COOKIE, data.id, {
        maxAgeSeconds: ACTIVE_LIST_COOKIE_MAX_AGE_SECONDS,
      })
      return { ok: true }
    } finally {
      setIsPending(false)
    }
  }, [])

  const renameList = useCallback(async (id: string, name: string): Promise<CrudResult> => {
    const offline = requireOnline('rename')
    if (offline) return { ok: false, error: offline }

    const validated = validateName(name)
    if (!validated.ok) return validated

    setIsPending(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.from('lists').update({ name: validated.name }).eq('id', id)
      if (error) {
        console.error('[useListCrud] rename failed', error)
        return { ok: false, error: "Couldn't rename the list. Try again." }
      }
      useHouseholdStore.getState().updateList(id, { name: validated.name })
      return { ok: true }
    } finally {
      setIsPending(false)
    }
  }, [])

  const deleteList = useCallback(async (id: string): Promise<CrudResult> => {
    const offline = requireOnline('delete')
    if (offline) return { ok: false, error: offline }

    const state = useHouseholdStore.getState()
    if (state.lists.length <= 1) {
      return { ok: false, error: 'A household needs at least one list.' }
    }

    setIsPending(true)
    const supabase = createClient()
    try {
      // RLS lets owners + the creator delete; anyone else hits an empty
      // delete with no error (Postgres returns 0 rows). Use returning to
      // confirm the row actually went.
      const { data, error } = await supabase.from('lists').delete().eq('id', id).select('id')
      if (error) {
        console.error('[useListCrud] delete failed', error)
        return { ok: false, error: "Couldn't delete the list. Try again." }
      }
      if (!data || data.length === 0) {
        return {
          ok: false,
          error: 'Only the list creator or household owner can delete this list.',
        }
      }
      const after = state.lists.filter((l) => l.id !== id)
      state.removeList(id)
      if (state.activeListId === id) {
        const fallback = after[0]
        if (fallback) {
          state.setActiveListId(fallback.id)
          setCookie(ACTIVE_LIST_COOKIE, fallback.id, {
            maxAgeSeconds: ACTIVE_LIST_COOKIE_MAX_AGE_SECONDS,
          })
        }
      }
      return { ok: true }
    } finally {
      setIsPending(false)
    }
  }, [])

  return { createList, renameList, deleteList, isPending }
}

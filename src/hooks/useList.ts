'use client'

import { useCallback, useEffect, useRef } from 'react'

import { categorizeRemote, detectCategoryKeyword, FALLBACK_CATEGORY } from '@/lib/categories'
import { loadListSnapshot, saveListSnapshot } from '@/lib/offline/cache'
import { runQueuedOp } from '@/lib/offline/executor'
import { enqueue, peekHead, queueLength, removeHead, type QueuedOp } from '@/lib/offline/queue'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'
import { useHouseholdStore } from '@/store/householdStore'
import { useListStore, type ListItem } from '@/store/listStore'
import { useSyncStore } from '@/store/syncStore'
import { useUserStore } from '@/store/userStore'

type ListItemInsert = Database['public']['Tables']['list_items']['Insert']
type ListItemUpdate = Database['public']['Tables']['list_items']['Update']

export type FinishShoppingResult =
  | { ok: true; removed: number; kept: number; tripId: string | null }
  | { ok: false; error: string }

export interface RestoreItemSnapshot {
  name: string
  category: string
  quantity: string | null
  quantity_value: number | null
  quantity_unit: string | null
  note: string | null
}

export type RestoreItemResult = { ok: true } | { ok: false; error: string }

export interface UseListApi {
  items: ListItem[]
  isLoading: boolean
  addItem: (name: string) => Promise<void>
  toggleChecked: (id: string) => Promise<void>
  updateItem: (
    id: string,
    patch: {
      name?: string
      category?: string
      category_pending?: boolean
      quantity_value?: number | null
      quantity_unit?: string | null
      note?: string | null
      is_recurring?: boolean
    },
  ) => Promise<void>
  deleteItem: (id: string) => Promise<ListItem | null>
  undoDelete: (item: ListItem) => Promise<void>
  finishShopping: () => Promise<FinishShoppingResult>
  restoreItem: (snapshot: RestoreItemSnapshot) => Promise<RestoreItemResult>
}

// A TypeError from fetch (DNS, offline, socket reset) is the universal sign
// that the write didn't reach the server. PostgrestError carries a `code`
// field — those are real rejections that should roll back, not queue.
function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (error instanceof TypeError) return true
  if (
    typeof error === 'object' &&
    error !== null &&
    !('code' in error) &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    /failed to fetch|network|load failed/i.test((error as { message: string }).message)
  ) {
    return true
  }
  return false
}

async function refreshQueuedCount(): Promise<void> {
  const n = await queueLength()
  useSyncStore.getState().setQueuedCount(n)
}

async function pushToQueue(op: QueuedOp): Promise<void> {
  await enqueue(op)
  await refreshQueuedCount()
}

// Module-scoped mutex so concurrent triggers (online event + SUBSCRIBED
// reconnect firing close together) don't double-drain.
let isDraining = false

// M15 — fire-and-forget LLM resolution for a single item that hit the keyword
// miss path in addItem. Failures (rate-limited, network, malformed) leave
// category_pending=true so the reconnect sweep can retry on the next online
// transition.
async function resolvePendingCategory(
  itemId: string,
  itemName: string,
  householdId: string,
): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const result = await categorizeRemote(itemName, householdId)
  if (result.source === 'error' || result.source === 'rate_limited') return

  const supabase = createClient()
  const { error } = await supabase
    .from('list_items')
    .update({ category: result.category, category_pending: false })
    .eq('id', itemId)

  if (error) {
    console.warn('[useList] resolvePendingCategory update failed', error)
    return
  }

  // The realtime echo will eventually update the store too, but patch locally
  // for snappier UX (especially on weak networks).
  useListStore.getState().updateItemOptimistic(itemId, {
    category: result.category,
    category_pending: false,
  })
}

// M15 — sweep all category_pending=true items for the current list on
// reconnect / re-subscribe. Sequential to keep within the 150/day cap and
// because Gemini's free tier RPM is also tight. Capped per session.
let isSweepingPendingCategories = false
const PENDING_SWEEP_LIMIT = 20

async function sweepPendingCategories(listId: string, householdId: string): Promise<void> {
  if (isSweepingPendingCategories) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const pending = useListStore
    .getState()
    .items.filter((i) => i.list_id === listId && i.category_pending)
    .slice(0, PENDING_SWEEP_LIMIT)

  if (pending.length === 0) return

  isSweepingPendingCategories = true
  try {
    for (const item of pending) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break
      await resolvePendingCategory(item.id, item.name, householdId)
    }
  } finally {
    isSweepingPendingCategories = false
  }
}

async function drainQueue(onAfterDrain?: () => void): Promise<void> {
  if (isDraining) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  isDraining = true
  try {
    const client = createClient()
    while (true) {
      const head = await peekHead()
      if (!head) break
      const result = await runQueuedOp(client, head.op)
      if (result.ok) {
        await removeHead(head.id)
        await refreshQueuedCount()
        continue
      }
      if (result.kind === 'network') {
        // Bail; head stays in place. Next online/SUBSCRIBED transition retries.
        break
      }
      // Server rejected the op (RLS, missing row, bad payload). Retrying will
      // never succeed — drop it and let the post-drain refetch reconcile the
      // store with whatever the server's truth is.
      console.warn('[drainQueue] dropping rejected op', head.op, result.error)
      await removeHead(head.id)
      await refreshQueuedCount()
    }
  } finally {
    isDraining = false
    if (typeof onAfterDrain === 'function') onAfterDrain()
  }
}

export function useList(): UseListApi {
  const listId = useHouseholdStore((state) => state.activeListId)
  const userId = useUserStore((state) => state.userId)

  const items = useListStore((state) => state.items)
  const isLoading = useListStore((state) => state.isLoading)

  // Keep a stable ref to the current items so action callbacks can compute
  // sort_order without subscribing to every store change.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Surface initial queue depth on mount so the offline banner reflects state
  // even before the first write or reconnect.
  useEffect(() => {
    void refreshQueuedCount()
  }, [])

  useEffect(() => {
    if (!listId) return
    let cancelled = false
    let isInitialFetch = true
    const supabase = createClient()

    useListStore.getState().setLoading(true)

    // Hydrate from the IndexedDB snapshot immediately. If we're offline this
    // is what the user sees; if we're online it's a near-instant first paint
    // that the network fetch then reconciles.
    void (async () => {
      const cached = await loadListSnapshot(listId)
      if (cancelled || !cached) return
      // Don't clobber a server fetch that landed first — only hydrate if the
      // store is still empty + loading.
      const state = useListStore.getState()
      if (state.items.length === 0 && state.isLoading) {
        state.setItems(cached)
      }
    })()

    async function fetchAndReconcile() {
      const { data, error } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', listId!)
        .order('sort_order', { ascending: true })
      if (cancelled) return
      if (error) {
        console.error('[useList] fetch failed', error)
        // Initial-fetch failure with no cache → empty list. Cache hydrate
        // above will have populated the store if a snapshot existed.
        if (isInitialFetch && useListStore.getState().items.length === 0) {
          useListStore.getState().setItems([])
        }
        return
      }
      const rows = data ?? []
      if (isInitialFetch) {
        useListStore.getState().setItems(rows)
        isInitialFetch = false
      } else {
        useListStore.getState().reconcileWithServer(rows)
      }
      void saveListSnapshot(listId!, rows)

      // M15 — kick off the pending-category sweep after we've reconciled with
      // the server. Runs at most once per fetchAndReconcile cycle and is
      // gated internally by `isSweepingPendingCategories` to coalesce with
      // the concurrent visibility/online refetches.
      const householdId = useHouseholdStore.getState().householdId
      if (householdId && rows.some((r) => r.category_pending)) {
        void sweepPendingCategories(listId!, householdId)
      }
    }

    // Subscribe first, then fetch from inside the SUBSCRIBED callback. This
    // removes the "events arrived during the gap between fetch and subscribe"
    // failure mode. On reconnect SUBSCRIBED fires again → we drain any queued
    // writes, then refetch and reconcile.
    const channel = supabase
      .channel(`list:${listId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          const row = payload.new as ListItem
          const isEcho = useListStore.getState().items.some((i) => i.id === row.id)
          useListStore.getState().addItemOptimistic(row)
          if (!isEcho) {
            useListStore.getState().markFresh(row.id)
            window.setTimeout(() => {
              useListStore.getState().clearFresh(row.id)
            }, 1500)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          const row = payload.new as ListItem
          useListStore.getState().updateItemOptimistic(row.id, row)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string }
          if (old.id) useListStore.getState().removeItemOptimistic(old.id)
        },
      )
      .subscribe((status, err) => {
        // Log every status transition. The realtime client only auto-recovers
        // from some failure modes — silent dead-channel bugs are easier to
        // diagnose with this trace in the console.
        if (err) {
          console.warn(`[useList] channel ${status}:`, err)
        } else if (status !== 'SUBSCRIBED') {
          console.info(`[useList] channel status: ${status}`)
        }
        if (status === 'SUBSCRIBED' && !cancelled) {
          // Drain first so our own offline writes land before the refetch
          // captures server state — otherwise the refetch could clobber a
          // queued optimistic add that's still in the store.
          void drainQueue(() => {
            if (!cancelled) void fetchAndReconcile()
          })
        }
      })

    // Tab-backgrounding closes WebSockets on iOS Safari and (aggressively)
    // mobile Chrome. The realtime client *should* auto-reconnect → SUBSCRIBED
    // → existing resync. But sometimes the reconnect stalls in CHANNEL_ERROR /
    // TIMED_OUT and never emits SUBSCRIBED again, and events that fired in the
    // gap are lost forever (Supabase doesn't buffer per-client). Forcing a
    // REST resync on every visible-transition is the safe net: cheap, works
    // even if the socket is dead, idempotent if it isn't.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || cancelled) return
      void drainQueue(() => {
        if (!cancelled) void fetchAndReconcile()
      })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void supabase.removeChannel(channel)
    }
  }, [listId])

  // Drain on `online` transition. SUBSCRIBED also drains, but the realtime
  // socket can take a beat to flip after the network returns — kicking off
  // a drain immediately on the OS-level event makes reconnect feel snappy.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => {
      void drainQueue()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const addItem = useCallback(
    async (rawName: string) => {
      const name = rawName.trim()
      if (!name || !listId) return

      const supabase = createClient()
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const maxSort = itemsRef.current.reduce((acc, i) => Math.max(acc, i.sort_order), 0)

      // M15 two-tier: keyword first (sync, offline). A miss flags the row as
      // category_pending so the reconnect sweep (or the inline fire-and-forget
      // below) can repair it later. We default the displayed category to
      // 'Other' on a miss so the item shows up immediately under a known
      // section rather than disappearing into limbo.
      const keywordHit = detectCategoryKeyword(name)
      const initialCategory = keywordHit ?? FALLBACK_CATEGORY
      const needsRemote = keywordHit === null
      const householdId = useHouseholdStore.getState().householdId

      const optimistic: ListItem = {
        id,
        list_id: listId,
        added_by: userId,
        added_by_name: null,
        name,
        quantity: null,
        quantity_value: null,
        quantity_unit: null,
        category: initialCategory,
        category_pending: needsRemote,
        is_checked: false,
        is_recurring: false,
        checked_by: null,
        checked_at: null,
        note: null,
        sort_order: maxSort + 1,
        created_at: now,
        updated_at: now,
      }

      useListStore.getState().addItemOptimistic(optimistic)

      const payload: ListItemInsert = {
        id,
        list_id: listId,
        added_by: userId ?? undefined,
        name,
        category: initialCategory,
        category_pending: needsRemote,
        sort_order: maxSort + 1,
      }

      useSyncStore.getState().beginWrite()
      let succeeded = false
      try {
        const { error } = await supabase.from('list_items').insert(payload)
        if (error) {
          if (isNetworkError(error)) {
            await pushToQueue({ kind: 'insert', row: optimistic })
            // Optimistic add stays in the store — the realtime echo (after
            // drain) will be deduped via the id-presence check. The pending
            // flag travels in the queued row and the reconnect sweep clears
            // it once we're back online.
            return
          }
          console.error('[useList] add failed', error)
          useListStore.getState().removeItemOptimistic(id)
          throw error
        }
        succeeded = true

        // Inline LLM resolution — only when the keyword pass missed and we
        // have an active household. Fire-and-forget; failures stay pending
        // for the reconnect sweep to retry.
        if (needsRemote && householdId) {
          void resolvePendingCategory(id, name, householdId)
        }
      } catch (error) {
        if (isNetworkError(error)) {
          await pushToQueue({ kind: 'insert', row: optimistic })
          return
        }
        throw error
      } finally {
        useSyncStore.getState().endWrite(succeeded)
      }
    },
    [listId, userId],
  )

  const toggleChecked = useCallback(
    async (id: string) => {
      const current = itemsRef.current.find((i) => i.id === id)
      if (!current) return

      const nextChecked = !current.is_checked
      const supabase = createClient()
      const now = new Date().toISOString()

      const patch: Partial<ListItem> = {
        is_checked: nextChecked,
        checked_by: nextChecked ? userId : null,
        checked_at: nextChecked ? now : null,
      }
      useListStore.getState().updateItemOptimistic(id, patch)

      const update: ListItemUpdate = {
        is_checked: nextChecked,
        checked_by: nextChecked ? (userId ?? null) : null,
        checked_at: nextChecked ? now : null,
      }
      useSyncStore.getState().beginWrite()
      let succeeded = false
      try {
        const { error } = await supabase.from('list_items').update(update).eq('id', id)
        if (error) {
          if (isNetworkError(error)) {
            await pushToQueue({
              kind: 'update',
              id,
              patch: {
                is_checked: update.is_checked!,
                checked_by: update.checked_by ?? null,
                checked_at: update.checked_at ?? null,
              },
            })
            return
          }
          console.error('[useList] toggle failed', error)
          useListStore.getState().updateItemOptimistic(id, {
            is_checked: current.is_checked,
            checked_by: current.checked_by,
            checked_at: current.checked_at,
          })
          throw error
        }
        succeeded = true
      } catch (error) {
        if (isNetworkError(error)) {
          await pushToQueue({
            kind: 'update',
            id,
            patch: {
              is_checked: update.is_checked!,
              checked_by: update.checked_by ?? null,
              checked_at: update.checked_at ?? null,
            },
          })
          return
        }
        throw error
      } finally {
        useSyncStore.getState().endWrite(succeeded)
      }
    },
    [userId],
  )

  const updateItem = useCallback(
    async (
      id: string,
      patch: {
        name?: string
        category?: string
        category_pending?: boolean
        quantity_value?: number | null
        quantity_unit?: string | null
        note?: string | null
        is_recurring?: boolean
      },
    ) => {
      const current = itemsRef.current.find((i) => i.id === id)
      if (!current) return

      const next: Partial<ListItem> = {}
      if (patch.name !== undefined) next.name = patch.name.trim()
      if (patch.category !== undefined) next.category = patch.category
      if (patch.category_pending !== undefined) next.category_pending = patch.category_pending
      if (patch.quantity_value !== undefined) next.quantity_value = patch.quantity_value
      if (patch.quantity_unit !== undefined) next.quantity_unit = patch.quantity_unit
      if (patch.is_recurring !== undefined) next.is_recurring = patch.is_recurring
      if (patch.note !== undefined) {
        const trimmed = patch.note?.trim() ?? null
        next.note = trimmed && trimmed.length > 0 ? trimmed : null
      }
      if (Object.keys(next).length === 0) return

      const supabase = createClient()
      useListStore.getState().updateItemOptimistic(id, next)

      useSyncStore.getState().beginWrite()
      let succeeded = false
      try {
        const { error } = await supabase.from('list_items').update(next).eq('id', id)
        if (error) {
          if (isNetworkError(error)) {
            await pushToQueue({ kind: 'update', id, patch: next })
            return
          }
          console.error('[useList] update failed', error)
          useListStore.getState().updateItemOptimistic(id, {
            name: current.name,
            category: current.category,
            quantity_value: current.quantity_value,
            quantity_unit: current.quantity_unit,
            is_recurring: current.is_recurring,
            note: current.note,
          })
          throw error
        }
        succeeded = true
      } catch (error) {
        if (isNetworkError(error)) {
          await pushToQueue({ kind: 'update', id, patch: next })
          return
        }
        throw error
      } finally {
        useSyncStore.getState().endWrite(succeeded)
      }
    },
    [],
  )

  const deleteItem = useCallback(async (id: string): Promise<ListItem | null> => {
    const current = itemsRef.current.find((i) => i.id === id)
    if (!current) return null

    const supabase = createClient()
    useListStore.getState().removeItemOptimistic(id)

    useSyncStore.getState().beginWrite()
    let succeeded = false
    try {
      const { error } = await supabase.from('list_items').delete().eq('id', id)
      if (error) {
        if (isNetworkError(error)) {
          await pushToQueue({ kind: 'delete', id })
          return current
        }
        console.error('[useList] delete failed', error)
        useListStore.getState().addItemOptimistic(current)
        throw error
      }
      succeeded = true
    } catch (error) {
      if (isNetworkError(error)) {
        await pushToQueue({ kind: 'delete', id })
        return current
      }
      throw error
    } finally {
      useSyncStore.getState().endWrite(succeeded)
    }
    return current
  }, [])

  const undoDelete = useCallback(async (item: ListItem) => {
    const supabase = createClient()
    useListStore.getState().addItemOptimistic(item)

    const payload: ListItemInsert = {
      id: item.id,
      list_id: item.list_id,
      added_by: item.added_by ?? undefined,
      name: item.name,
      quantity: item.quantity,
      quantity_value: item.quantity_value,
      quantity_unit: item.quantity_unit,
      category: item.category,
      is_checked: item.is_checked,
      checked_by: item.checked_by,
      checked_at: item.checked_at,
      note: item.note,
      sort_order: item.sort_order,
    }
    useSyncStore.getState().beginWrite()
    let succeeded = false
    try {
      const { error } = await supabase.from('list_items').insert(payload)
      if (error) {
        if (isNetworkError(error)) {
          await pushToQueue({ kind: 'insert', row: item })
          return
        }
        console.error('[useList] undo-delete failed', error)
        useListStore.getState().removeItemOptimistic(item.id)
        throw error
      }
      succeeded = true
    } catch (error) {
      if (isNetworkError(error)) {
        await pushToQueue({ kind: 'insert', row: item })
        return
      }
      throw error
    } finally {
      useSyncStore.getState().endWrite(succeeded)
    }
  }, [])

  // M11: finish_shopping replaces the M3 clearChecked path.
  //
  // Online-only by design — the RPC mutates three tables atomically and
  // realtime pushes the resulting deletes/updates back. Queueing it for hours
  // is fragile (the snapshot would freeze the user's local view of the trip
  // even if other members keep editing online).
  const finishShopping = useCallback(async (): Promise<FinishShoppingResult> => {
    if (!listId) return { ok: false, error: 'No active list.' }

    const checked = itemsRef.current.filter((i) => i.is_checked)
    if (checked.length === 0) {
      return { ok: true, removed: 0, kept: 0, tripId: null }
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { ok: false, error: 'Connect to the internet to finish your trip.' }
    }

    const removed = checked.filter((i) => !i.is_recurring)
    const kept = checked.filter((i) => i.is_recurring)

    // Optimistic: drop non-recurring rows, uncheck recurring rows. Realtime
    // will confirm both via DELETE / UPDATE events.
    for (const item of removed) {
      useListStore.getState().removeItemOptimistic(item.id)
    }
    for (const item of kept) {
      useListStore.getState().updateItemOptimistic(item.id, {
        is_checked: false,
        checked_by: null,
        checked_at: null,
      })
    }

    const supabase = createClient()
    useSyncStore.getState().beginWrite()
    let succeeded = false
    try {
      const { data, error } = await supabase.rpc('finish_shopping', { p_list_id: listId })
      if (error) {
        if (isNetworkError(error)) {
          // Roll back the optimistic mutations — no queue path for this RPC.
          for (const item of removed) useListStore.getState().addItemOptimistic(item)
          for (const item of kept) {
            useListStore.getState().updateItemOptimistic(item.id, {
              is_checked: item.is_checked,
              checked_by: item.checked_by,
              checked_at: item.checked_at,
            })
          }
          return { ok: false, error: 'Connect to the internet to finish your trip.' }
        }
        console.error('[useList] finish-shopping failed', error)
        for (const item of removed) useListStore.getState().addItemOptimistic(item)
        for (const item of kept) {
          useListStore.getState().updateItemOptimistic(item.id, {
            is_checked: item.is_checked,
            checked_by: item.checked_by,
            checked_at: item.checked_at,
          })
        }
        return { ok: false, error: "Couldn't finish your trip. Try again." }
      }
      succeeded = true
      const payload = (data ?? {}) as {
        status?: string
        trip_id?: string
        removed?: number
        kept?: number
      }
      if (payload.status === 'finished') {
        return {
          ok: true,
          removed: payload.removed ?? removed.length,
          kept: payload.kept ?? kept.length,
          tripId: payload.trip_id ?? null,
        }
      }
      if (payload.status === 'nothing_to_finish') {
        return { ok: true, removed: 0, kept: 0, tripId: null }
      }
      // Anything else (forbidden / list_not_found / unauthenticated) — roll
      // back and report. Should be unreachable in normal use given RLS.
      for (const item of removed) useListStore.getState().addItemOptimistic(item)
      for (const item of kept) {
        useListStore.getState().updateItemOptimistic(item.id, {
          is_checked: item.is_checked,
          checked_by: item.checked_by,
          checked_at: item.checked_at,
        })
      }
      return { ok: false, error: "Couldn't finish your trip. Try again." }
    } finally {
      useSyncStore.getState().endWrite(succeeded)
    }
  }, [listId])

  // M12: Restore a snapshot from shopping_trip_items into the active list.
  // Mirrors addItem's optimistic + offline-queue flow but uses the trip
  // snapshot's category / quantity / note directly instead of running the
  // detectCategory keyword pass.
  const restoreItem = useCallback(
    async (snapshot: RestoreItemSnapshot): Promise<RestoreItemResult> => {
      if (!listId) return { ok: false, error: 'No active list.' }
      const name = snapshot.name.trim()
      if (!name) return { ok: false, error: 'Item name is empty.' }

      const supabase = createClient()
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const maxSort = itemsRef.current.reduce((acc, i) => Math.max(acc, i.sort_order), 0)

      const optimistic: ListItem = {
        id,
        list_id: listId,
        added_by: userId,
        added_by_name: null,
        name,
        quantity: snapshot.quantity,
        quantity_value: snapshot.quantity_value,
        quantity_unit: snapshot.quantity_unit,
        category: snapshot.category,
        category_pending: false,
        is_checked: false,
        is_recurring: false,
        checked_by: null,
        checked_at: null,
        note: snapshot.note,
        sort_order: maxSort + 1,
        created_at: now,
        updated_at: now,
      }

      useListStore.getState().addItemOptimistic(optimistic)

      const payload: ListItemInsert = {
        id,
        list_id: listId,
        added_by: userId ?? undefined,
        name,
        category: snapshot.category,
        quantity: snapshot.quantity,
        quantity_value: snapshot.quantity_value,
        quantity_unit: snapshot.quantity_unit,
        note: snapshot.note,
        sort_order: maxSort + 1,
      }

      useSyncStore.getState().beginWrite()
      let succeeded = false
      try {
        const { error } = await supabase.from('list_items').insert(payload)
        if (error) {
          if (isNetworkError(error)) {
            await pushToQueue({ kind: 'insert', row: optimistic })
            return { ok: true }
          }
          console.error('[useList] restore failed', error)
          useListStore.getState().removeItemOptimistic(id)
          return { ok: false, error: "Couldn't restore that item. Try again." }
        }
        succeeded = true
        return { ok: true }
      } catch (error) {
        if (isNetworkError(error)) {
          await pushToQueue({ kind: 'insert', row: optimistic })
          return { ok: true }
        }
        console.error('[useList] restore threw', error)
        useListStore.getState().removeItemOptimistic(id)
        return { ok: false, error: "Couldn't restore that item. Try again." }
      } finally {
        useSyncStore.getState().endWrite(succeeded)
      }
    },
    [listId, userId],
  )

  return {
    items,
    isLoading,
    addItem,
    toggleChecked,
    updateItem,
    deleteItem,
    undoDelete,
    finishShopping,
    restoreItem,
  }
}

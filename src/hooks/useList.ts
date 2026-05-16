'use client'

import { useCallback, useEffect, useRef } from 'react'

import { detectCategory } from '@/lib/categories'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'
import { useHouseholdStore } from '@/store/householdStore'
import { useListStore, type ListItem } from '@/store/listStore'
import { useUserStore } from '@/store/userStore'

type ListItemInsert = Database['public']['Tables']['list_items']['Insert']
type ListItemUpdate = Database['public']['Tables']['list_items']['Update']

export interface UseListApi {
  items: ListItem[]
  isLoading: boolean
  addItem: (name: string) => Promise<void>
  toggleChecked: (id: string) => Promise<void>
  updateItem: (id: string, patch: { name?: string; category?: string }) => Promise<void>
  deleteItem: (id: string) => Promise<ListItem | null>
  undoDelete: (item: ListItem) => Promise<void>
  clearChecked: () => Promise<ListItem[]>
}

export function useList(): UseListApi {
  const listId = useHouseholdStore((state) => state.listId)
  const userId = useUserStore((state) => state.userId)

  const items = useListStore((state) => state.items)
  const isLoading = useListStore((state) => state.isLoading)

  // Keep a stable ref to the current items so action callbacks can compute
  // sort_order without subscribing to every store change.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    if (!listId) return
    let cancelled = false
    const supabase = createClient()

    useListStore.getState().setLoading(true)

    supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('[useList] initial fetch failed', error)
          useListStore.getState().setItems([])
          return
        }
        useListStore.getState().setItems(data ?? [])
      })

    return () => {
      cancelled = true
    }
  }, [listId])

  const addItem = useCallback(
    async (rawName: string) => {
      const name = rawName.trim()
      if (!name || !listId) return

      const supabase = createClient()
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const maxSort = itemsRef.current.reduce((acc, i) => Math.max(acc, i.sort_order), 0)
      const category = detectCategory(name)

      const optimistic: ListItem = {
        id,
        list_id: listId,
        added_by: userId,
        added_by_name: null,
        name,
        quantity: null,
        category,
        is_checked: false,
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
        category,
        sort_order: maxSort + 1,
      }

      const { error } = await supabase.from('list_items').insert(payload)
      if (error) {
        console.error('[useList] add failed', error)
        useListStore.getState().removeItemOptimistic(id)
        throw error
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
      const { error } = await supabase.from('list_items').update(update).eq('id', id)
      if (error) {
        console.error('[useList] toggle failed', error)
        useListStore.getState().updateItemOptimistic(id, {
          is_checked: current.is_checked,
          checked_by: current.checked_by,
          checked_at: current.checked_at,
        })
        throw error
      }
    },
    [userId],
  )

  const updateItem = useCallback(
    async (id: string, patch: { name?: string; category?: string }) => {
      const current = itemsRef.current.find((i) => i.id === id)
      if (!current) return

      const next: Partial<ListItem> = {}
      if (patch.name !== undefined) next.name = patch.name.trim()
      if (patch.category !== undefined) next.category = patch.category
      if (Object.keys(next).length === 0) return

      const supabase = createClient()
      useListStore.getState().updateItemOptimistic(id, next)

      const { error } = await supabase.from('list_items').update(next).eq('id', id)
      if (error) {
        console.error('[useList] update failed', error)
        useListStore.getState().updateItemOptimistic(id, {
          name: current.name,
          category: current.category,
        })
        throw error
      }
    },
    [],
  )

  const deleteItem = useCallback(async (id: string): Promise<ListItem | null> => {
    const current = itemsRef.current.find((i) => i.id === id)
    if (!current) return null

    const supabase = createClient()
    useListStore.getState().removeItemOptimistic(id)

    const { error } = await supabase.from('list_items').delete().eq('id', id)
    if (error) {
      console.error('[useList] delete failed', error)
      useListStore.getState().addItemOptimistic(current)
      throw error
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
      category: item.category,
      is_checked: item.is_checked,
      checked_by: item.checked_by,
      checked_at: item.checked_at,
      note: item.note,
      sort_order: item.sort_order,
    }
    const { error } = await supabase.from('list_items').insert(payload)
    if (error) {
      console.error('[useList] undo-delete failed', error)
      useListStore.getState().removeItemOptimistic(item.id)
      throw error
    }
  }, [])

  const clearChecked = useCallback(async (): Promise<ListItem[]> => {
    if (!listId) return []
    const checked = itemsRef.current.filter((i) => i.is_checked)
    if (checked.length === 0) return []

    const supabase = createClient()
    for (const item of checked) {
      useListStore.getState().removeItemOptimistic(item.id)
    }

    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', listId)
      .eq('is_checked', true)
    if (error) {
      console.error('[useList] clear-checked failed', error)
      for (const item of checked) {
        useListStore.getState().addItemOptimistic(item)
      }
      throw error
    }
    return checked
  }, [listId])

  return {
    items,
    isLoading,
    addItem,
    toggleChecked,
    updateItem,
    deleteItem,
    undoDelete,
    clearChecked,
  }
}

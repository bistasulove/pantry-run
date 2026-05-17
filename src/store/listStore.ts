import { create } from 'zustand'

import type { Database } from '@/lib/database.types'

export type ListItem = Database['public']['Tables']['list_items']['Row']

interface ListStore {
  items: ListItem[]
  isLoading: boolean
  // Ids that just arrived via a realtime INSERT (not from our own optimistic
  // add). ListItem reads this to render a short left-border flash. Auto-cleared
  // by useList ~1500ms after marking.
  freshlySyncedIds: Set<string>
  setLoading: (loading: boolean) => void
  setItems: (items: ListItem[]) => void
  addItemOptimistic: (item: ListItem) => void
  updateItemOptimistic: (id: string, patch: Partial<ListItem>) => void
  removeItemOptimistic: (id: string) => void
  // Replace the canonical state with the server snapshot — used for failure
  // rollback after a write rejects, and (in M4) for re-sync after reconnect.
  reconcileWithServer: (items: ListItem[]) => void
  markFresh: (id: string) => void
  clearFresh: (id: string) => void
}

export const useListStore = create<ListStore>((set) => ({
  items: [],
  isLoading: true,
  freshlySyncedIds: new Set<string>(),
  setLoading: (isLoading) => set({ isLoading }),
  setItems: (items) => set({ items, isLoading: false }),
  addItemOptimistic: (item) =>
    set((state) => {
      if (state.items.some((i) => i.id === item.id)) return state
      return { items: [...state.items, item] }
    }),
  updateItemOptimistic: (id, patch) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
  removeItemOptimistic: (id) =>
    set((state) => {
      const items = state.items.filter((i) => i.id !== id)
      if (!state.freshlySyncedIds.has(id)) return { items }
      const next = new Set(state.freshlySyncedIds)
      next.delete(id)
      return { items, freshlySyncedIds: next }
    }),
  reconcileWithServer: (items) => set({ items }),
  markFresh: (id) =>
    set((state) => {
      if (state.freshlySyncedIds.has(id)) return state
      const next = new Set(state.freshlySyncedIds)
      next.add(id)
      return { freshlySyncedIds: next }
    }),
  clearFresh: (id) =>
    set((state) => {
      if (!state.freshlySyncedIds.has(id)) return state
      const next = new Set(state.freshlySyncedIds)
      next.delete(id)
      return { freshlySyncedIds: next }
    }),
}))

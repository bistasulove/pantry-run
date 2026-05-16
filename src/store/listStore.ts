import { create } from 'zustand'

import type { Database } from '@/lib/database.types'

export type ListItem = Database['public']['Tables']['list_items']['Row']

interface ListStore {
  items: ListItem[]
  isLoading: boolean
  setLoading: (loading: boolean) => void
  setItems: (items: ListItem[]) => void
  addItemOptimistic: (item: ListItem) => void
  updateItemOptimistic: (id: string, patch: Partial<ListItem>) => void
  removeItemOptimistic: (id: string) => void
  // Replace the canonical state with the server snapshot — used for failure
  // rollback after a write rejects, and (in M4) for re-sync after reconnect.
  reconcileWithServer: (items: ListItem[]) => void
}

export const useListStore = create<ListStore>((set) => ({
  items: [],
  isLoading: true,
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
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
  reconcileWithServer: (items) => set({ items }),
}))

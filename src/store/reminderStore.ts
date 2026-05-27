import { create } from 'zustand'

import type { Database } from '@/lib/database.types'

export type Reminder = Database['public']['Tables']['reminders']['Row']

interface ReminderStore {
  items: Reminder[]
  isLoaded: boolean
  setAll: (items: Reminder[]) => void
  addOptimistic: (item: Reminder) => void
  updateOptimistic: (id: string, patch: Partial<Reminder>) => void
  removeOptimistic: (id: string) => void
  clear: () => void
}

// Single source of truth for the active household's reminders. Mirrors the
// list/store split (M3) — useReminders does the network + realtime; the store
// holds the optimistic state the UI renders from.

export const useReminderStore = create<ReminderStore>((set) => ({
  items: [],
  isLoaded: false,
  setAll: (items) => set({ items, isLoaded: true }),
  addOptimistic: (item) =>
    set((s) => {
      if (s.items.some((r) => r.id === item.id)) return s
      return { items: [...s.items, item] }
    }),
  updateOptimistic: (id, patch) =>
    set((s) => ({ items: s.items.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
  removeOptimistic: (id) => set((s) => ({ items: s.items.filter((r) => r.id !== id) })),
  clear: () => set({ items: [], isLoaded: false }),
}))

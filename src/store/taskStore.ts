import { create } from 'zustand'

import type { Database } from '@/lib/database.types'

export type Task = Database['public']['Tables']['tasks']['Row']

interface TaskStore {
  items: Task[]
  isLoaded: boolean
  setAll: (items: Task[]) => void
  addOptimistic: (item: Task) => void
  updateOptimistic: (id: string, patch: Partial<Task>) => void
  removeOptimistic: (id: string) => void
  clear: () => void
}

// Single source of truth for the active household's tasks. Mirrors the
// reminder store (M17) — useTasks does the network + realtime + optimistic
// writes; the store holds the state PlanTasksView + BottomNav read from.
//
// The 30-day completed cutoff (M18 D8) is applied at the fetch layer in
// TasksRealtime, not here — the store is purely a cache of whatever was
// fetched + whatever realtime delivered.

export const useTaskStore = create<TaskStore>((set) => ({
  items: [],
  isLoaded: false,
  setAll: (items) => set({ items, isLoaded: true }),
  addOptimistic: (item) =>
    set((s) => {
      if (s.items.some((t) => t.id === item.id)) return s
      return { items: [...s.items, item] }
    }),
  updateOptimistic: (id, patch) =>
    set((s) => ({ items: s.items.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeOptimistic: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
  clear: () => set({ items: [], isLoaded: false }),
}))

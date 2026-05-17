import { create } from 'zustand'

interface SyncStore {
  // Number of writes currently in flight. SyncIndicator reveals a spinner
  // when this transitions to > 0 (with a 150ms threshold to suppress flicker
  // on sub-150ms writes) and a brief success flash on transition back to 0.
  pendingCount: number
  // Timestamp (ms) of the most recent *successful* transition pendingCount > 0 → 0.
  // SyncIndicator reads this to drive the green check flash. Failed writes
  // don't stamp this — a failed offline add shouldn't flash success.
  lastSuccessAt: number | null
  beginWrite: () => void
  endWrite: (success: boolean) => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  pendingCount: 0,
  lastSuccessAt: null,
  beginWrite: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
  endWrite: (success) =>
    set((state) => {
      const next = Math.max(0, state.pendingCount - 1)
      if (next === 0 && state.pendingCount > 0 && success) {
        return { pendingCount: 0, lastSuccessAt: Date.now() }
      }
      return { pendingCount: next }
    }),
}))

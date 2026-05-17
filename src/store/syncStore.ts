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
  // Number of operations sitting in the IndexedDB write queue waiting for the
  // network. Mirror of the on-disk count — kept in sync by useList via
  // setQueuedCount after every enqueue / drain step. OfflineBanner reads this
  // to render "Syncing N change(s)…".
  queuedCount: number
  beginWrite: () => void
  endWrite: (success: boolean) => void
  setQueuedCount: (count: number) => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  pendingCount: 0,
  lastSuccessAt: null,
  queuedCount: 0,
  beginWrite: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
  endWrite: (success) =>
    set((state) => {
      const next = Math.max(0, state.pendingCount - 1)
      if (next === 0 && state.pendingCount > 0 && success) {
        return { pendingCount: 0, lastSuccessAt: Date.now() }
      }
      return { pendingCount: next }
    }),
  setQueuedCount: (queuedCount) => set({ queuedCount: Math.max(0, queuedCount) }),
}))

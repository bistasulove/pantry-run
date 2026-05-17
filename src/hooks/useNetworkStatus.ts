'use client'

import { useSyncExternalStore } from 'react'

export interface NetworkStatus {
  isOnline: boolean
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot(): boolean {
  return window.navigator.onLine
}

// On the server we have no network signal — assume online so SSR matches the
// happy-path render and hydration doesn't flicker.
function getServerSnapshot(): boolean {
  return true
}

// `navigator.onLine` is the source of truth. iOS Safari can lie (reports
// online when the connection is actually wedged) — we accept that trade-off
// for M5 per CLAUDE.md decision; the failed Supabase fetch routes the op into
// the queue regardless of what `navigator.onLine` claims.
export function useNetworkStatus(): NetworkStatus {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { isOnline }
}

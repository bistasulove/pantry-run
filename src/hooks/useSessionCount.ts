'use client'

import { useEffect, useSyncExternalStore } from 'react'

// Counts the number of *unique calendar days* the app has been opened on this
// device. Bumps once per day, on the first mount that lands on a new day.
//
// Used by InstallBanner's iOS nudge to wait until the user has invested before
// nudging them to install — see plan.md §11 M6 ("appears after 3rd session").
// Day granularity is intentional: a single power-user day shouldn't trigger
// the nudge, and counting wall-clock minutes adds edge cases (background tabs,
// multiple windows) without meaningful benefit.

const STORAGE_KEY = 'pantry-run:session-state'

interface SessionState {
  count: number
  lastDay: string // YYYY-MM-DD
}

// Same useSyncExternalStore + same-tab notify pattern as useTheme + useNetworkStatus.
const listeners = new Set<() => void>()

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function readState(): SessionState {
  if (typeof window === 'undefined') return { count: 0, lastDay: '' }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { count: 0, lastDay: '' }
    const parsed = JSON.parse(raw) as Partial<SessionState>
    if (typeof parsed.count === 'number' && typeof parsed.lastDay === 'string') {
      return { count: parsed.count, lastDay: parsed.lastDay }
    }
  } catch {
    // Corrupt or unreadable — fall through and reset.
  }
  return { count: 0, lastDay: '' }
}

function readCount(): number {
  return readState().count
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

function notify() {
  listeners.forEach((l) => l())
}

function getServerSnapshot(): number {
  return 0
}

export function useSessionCount(): number {
  const count = useSyncExternalStore(subscribe, readCount, getServerSnapshot)

  // One-shot bump on mount if today hasn't been counted yet. The effect only
  // writes to localStorage + notifies — never calls setState directly, so the
  // react-hooks/set-state-in-effect rule stays happy. The notify() call wakes
  // useSyncExternalStore which then re-reads the bumped count.
  useEffect(() => {
    const state = readState()
    const today = todayStr()
    if (state.lastDay === today) return
    const next: SessionState = { count: state.count + 1, lastDay: today }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage write failure — the count stays at its previous value for this session.
      return
    }
    notify()
  }, [])

  return count
}

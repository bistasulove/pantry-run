'use client'

import { useSyncExternalStore } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'pantry-run:theme'

// `storage` events only fire in *other* tabs by spec, so same-tab writes
// notify this in-module listener set. Matches the useSyncExternalStore pattern
// established by useNetworkStatus.ts (M5 D9) — keeps us off the
// react-hooks/set-state-in-effect rule.
const listeners = new Set<() => void>()

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    // localStorage can throw in privacy modes — fall through to system default.
  }
  return 'system'
}

function applyMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  // 'system' clears the attribute so the @media (prefers-color-scheme) block wins.
  if (mode === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }
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

// SSR snapshot must match the pre-hydration <script> default (no data-theme
// attribute set), which is 'system' — see THEME_PRE_HYDRATION_SCRIPT in layout.tsx.
function getServerSnapshot(): ThemeMode {
  return 'system'
}

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, readStoredMode, getServerSnapshot)

  function setTheme(next: ThemeMode) {
    try {
      if (next === 'system') {
        window.localStorage.removeItem(STORAGE_KEY)
      } else {
        window.localStorage.setItem(STORAGE_KEY, next)
      }
    } catch {
      // localStorage failure leaves the in-memory state correct for this session.
    }
    applyMode(next)
    notify()
  }

  return { mode, setTheme }
}

'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

// Wraps the Android Chrome `beforeinstallprompt` event lifecycle. iOS Safari
// doesn't expose a programmatic install prompt — that path is handled by
// InstallBanner with manual "Tap Share → Add to Home Screen" copy.

const DISMISS_KEY = 'pantry-run:install-dismissed'

// BeforeInstallPromptEvent isn't in the standard lib.dom typings (still a
// Chromium proposal), so we describe the surface we actually call.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type PromptOutcome = 'accepted' | 'dismissed' | 'unavailable'

// Same useSyncExternalStore + same-tab notify pattern as useTheme + useNetworkStatus.
const listeners = new Set<() => void>()

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
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

function getServerSnapshot(): boolean {
  return false
}

export function useInstallPrompt() {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, getServerSnapshot)
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      // Chrome would otherwise show its mini-infobar; we render our own banner.
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstalled(true)
      setEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // In-memory dismissal still hides the banner for this session.
    }
    notify()
  }, [])

  const prompt = useCallback(async (): Promise<PromptOutcome> => {
    if (!event) return 'unavailable'
    await event.prompt()
    const { outcome } = await event.userChoice
    setEvent(null)
    if (outcome === 'dismissed') dismiss()
    return outcome
  }, [event, dismiss])

  const canPrompt = !!event && !dismissed && !installed
  return { canPrompt, prompt, dismiss }
}

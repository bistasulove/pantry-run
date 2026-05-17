'use client'

import { Share, X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'

import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useSessionCount } from '@/hooks/useSessionCount'

const IOS_DISMISS_KEY = 'pantry-run:ios-install-dismissed'
// Wait until the user has come back 3 different days before nudging — matches
// the "after the user has invested" cadence from plan.md §6.2 / §11 M6.
const IOS_NUDGE_SESSION_THRESHOLD = 3

type Platform = 'android-ready' | 'ios-safari' | 'none'

interface IOSNavigator extends Navigator {
  standalone?: boolean
}

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPad on iOS 13+ reports as Mac — fall back to touch-point sniff for that case.
  const looksLikeIPadOS =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua) || looksLikeIPadOS
  if (!isAppleMobile) return false
  // CriOS/FxiOS/EdgiOS are WebKit shells around Safari but can't install PWAs,
  // so showing them Safari-specific "Add to Home Screen" copy would mislead.
  return !/CriOS|FxiOS|EdgiOS/.test(ua)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  return (window.navigator as IOSNavigator).standalone === true
}

// Platform detection is a one-shot read — once the page is loaded, the answer
// doesn't change. useSyncExternalStore with a no-op subscribe gives us a clean
// SSR-safe read without an init effect (and without tripping the
// react-hooks/set-state-in-effect rule).
function platformSubscribe(): () => void {
  return () => {}
}

function readPlatform(): Platform {
  if (typeof window === 'undefined') return 'none'
  if (isStandalone()) return 'none'
  if (isIOSSafari()) return 'ios-safari'
  return 'android-ready'
}

function platformServerSnapshot(): Platform {
  return 'none'
}

// iOS-dismissed: same in-module pub/sub pattern as the other localStorage stores.
const iosDismissListeners = new Set<() => void>()

function readIOSDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(IOS_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function iosDismissSubscribe(callback: () => void): () => void {
  iosDismissListeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    iosDismissListeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

function notifyIOSDismiss() {
  iosDismissListeners.forEach((l) => l())
}

function iosDismissServerSnapshot(): boolean {
  return false
}

export function InstallBanner() {
  const { canPrompt, prompt, dismiss: dismissAndroid } = useInstallPrompt()
  const sessionCount = useSessionCount()
  const platform = useSyncExternalStore(platformSubscribe, readPlatform, platformServerSnapshot)
  const iosDismissed = useSyncExternalStore(
    iosDismissSubscribe,
    readIOSDismissed,
    iosDismissServerSnapshot,
  )
  const [installing, setInstalling] = useState(false)

  const handleInstall = async () => {
    setInstalling(true)
    try {
      await prompt()
    } finally {
      setInstalling(false)
    }
  }

  const handleDismissIOS = () => {
    try {
      window.localStorage.setItem(IOS_DISMISS_KEY, '1')
    } catch {
      // In-memory dismissal hides for the session.
    }
    notifyIOSDismiss()
  }

  // Android takes precedence — if the browser fired beforeinstallprompt we
  // have a real install path, so always prefer it over the manual iOS nudge.
  if (canPrompt) {
    return (
      <div role="status" className="border-border-default/60 bg-accent/10 border-b px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-text-primary text-[13px] leading-snug">
            Install Pantry Run for faster access.
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="text-accent min-h-[44px] px-2 text-[13px] leading-snug font-semibold tracking-wide uppercase disabled:opacity-50"
            >
              {installing ? 'Installing…' : 'Install'}
            </button>
            <button
              type="button"
              onClick={dismissAndroid}
              aria-label="Dismiss install prompt"
              className="text-text-secondary hover:text-text-primary flex h-11 w-11 items-center justify-center"
            >
              <X size={18} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (platform === 'ios-safari' && !iosDismissed && sessionCount >= IOS_NUDGE_SESSION_THRESHOLD) {
    return (
      <div role="status" className="border-border-default/60 bg-accent/10 border-b px-4 py-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-text-primary text-[13px] leading-snug">
            Install Pantry Run — tap{' '}
            <Share
              size={14}
              strokeWidth={1.5}
              className="-mt-0.5 inline align-middle"
              aria-label="the Share button"
            />{' '}
            then <span className="font-semibold">Add to Home Screen</span>.
          </p>
          <button
            type="button"
            onClick={handleDismissIOS}
            aria-label="Dismiss install hint"
            className="text-text-secondary hover:text-text-primary -mt-1 flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <X size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default InstallBanner

'use client'

import { X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'

import { UpgradeAccountSheet } from '@/components/auth/UpgradeAccountSheet'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'

const DISMISS_KEY = 'pantry-run:save-account-dismissed-at'
// Plan.md §11.5 M9: "unobtrusive banner after 7 days of use". After dismissal
// it re-appears in 14 days — long enough not to nag, short enough to surface
// when the user keeps coming back.
const SHOW_AFTER_DAYS = 7
const REDISMISS_AFTER_DAYS = 14
const MS_PER_DAY = 86_400_000

// Same useSyncExternalStore + same-tab notify pattern as useInstallPrompt and
// useSessionCount — keeps the localStorage read SSR-safe.
const listeners = new Set<() => void>()

function readDismissedAt(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    if (!raw) return null
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
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

function getServerSnapshot(): number | null {
  return null
}

function shouldShow(
  isAnonymous: boolean,
  hasPendingEmail: boolean,
  createdAt: string | null,
  dismissedAt: number | null,
): boolean {
  if (!isAnonymous) return false
  // Don't nag if they've already started — the banner CTA and the
  // AccountSection pending-confirmation card would be redundant.
  if (hasPendingEmail) return false
  if (!createdAt) return false
  const createdMs = new Date(createdAt).getTime()
  if (Number.isNaN(createdMs)) return false
  const now = Date.now()
  if (now - createdMs < SHOW_AFTER_DAYS * MS_PER_DAY) return false
  if (dismissedAt !== null && now - dismissedAt < REDISMISS_AFTER_DAYS * MS_PER_DAY) return false
  return true
}

export function SaveAccountBanner() {
  const { isAnonymous, pendingEmail, createdAt } = useSession()
  const dismissedAt = useSyncExternalStore(subscribe, readDismissedAt, getServerSnapshot)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Storage write failure — banner stays this session but rehydrates next visit.
    }
    notify()
  }

  if (!shouldShow(isAnonymous, !!pendingEmail, createdAt, dismissedAt)) {
    // Sheet/toast portals are scoped here, so unmount cleanly when we're hidden.
    return null
  }

  return (
    <>
      <div role="status" className="border-border-default/60 bg-accent/10 border-b px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="text-text-primary flex-1 text-left text-[13px] leading-snug"
          >
            Save your account so you can sign in on other devices.{' '}
            <span className="text-accent font-semibold tracking-wide uppercase">Save</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss save-account hint"
            className="text-text-secondary hover:text-text-primary flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <X size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
      <UpgradeAccountSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpgraded={(message) => {
          setToast({ message })
          // Once upgraded the banner unmounts because isAnonymous flips false —
          // no need to also write the dismissed timestamp.
        }}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  )
}

export default SaveAccountBanner

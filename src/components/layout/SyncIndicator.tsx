'use client'

import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useSyncStore } from '@/store/syncStore'

const SPINNER_REVEAL_MS = 150
const SUCCESS_FLASH_MS = 800

export function SyncIndicator() {
  const pendingCount = useSyncStore((s) => s.pendingCount)
  const lastSuccessAt = useSyncStore((s) => s.lastSuccessAt)
  const [showSpinner, setShowSpinner] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Reveal the spinner only if a write is still in flight after 150ms — most
  // writes finish well inside that window, so the user sees only the check.
  useEffect(() => {
    if (pendingCount === 0) {
      // Driven by the external syncStore signal; bounded, not cascading.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSpinner(false)
      return
    }
    const t = window.setTimeout(() => {
      if (useSyncStore.getState().pendingCount > 0) setShowSpinner(true)
    }, SPINNER_REVEAL_MS)
    return () => window.clearTimeout(t)
  }, [pendingCount])

  // Flash the check on every pending > 0 → 0 transition (the store stamps
  // lastSuccessAt on exactly those transitions).
  useEffect(() => {
    if (lastSuccessAt === null) return
    // Driven by the external syncStore signal; bounded by SUCCESS_FLASH_MS.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowSuccess(true)
    const t = window.setTimeout(() => setShowSuccess(false), SUCCESS_FLASH_MS)
    return () => window.clearTimeout(t)
  }, [lastSuccessAt])

  if (showSuccess) {
    return (
      <span
        role="status"
        aria-label="Changes synced"
        className="text-accent inline-flex h-[18px] w-[18px] items-center justify-center"
      >
        <Check size={18} strokeWidth={1.5} aria-hidden />
      </span>
    )
  }

  if (showSpinner) {
    return (
      <span
        role="status"
        aria-label="Syncing changes"
        className="text-text-secondary inline-flex h-[18px] w-[18px] items-center justify-center"
      >
        <Loader2 size={18} strokeWidth={1.5} className="animate-spin" aria-hidden />
      </span>
    )
  }

  return <span className="h-[18px] w-[18px]" aria-hidden />
}

export default SyncIndicator

'use client'

import { useEffect, useRef, useState } from 'react'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSyncStore } from '@/store/syncStore'

// Three display states:
//   - offline:    "Offline — changes will sync when you're back online"
//   - draining:   "Syncing N change(s)…"
//   - just synced: "Back online" (1500ms flash after queue empties post-reconnect)
//
// Stays hidden when online with an empty queue and no recent reconnect.
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()
  const queuedCount = useSyncStore((s) => s.queuedCount)

  const wasOfflineOrQueuedRef = useRef(false)
  const [showJustSynced, setShowJustSynced] = useState(false)

  useEffect(() => {
    // Track whether we were ever in an offline / drainable state during this
    // mount. The "Back online" flash only fires after a real recovery — not
    // on first paint when we happen to be online with an empty queue.
    if (!isOnline || queuedCount > 0) {
      wasOfflineOrQueuedRef.current = true
      return
    }
    if (!wasOfflineOrQueuedRef.current) return

    wasOfflineOrQueuedRef.current = false
    setShowJustSynced(true)
    const t = window.setTimeout(() => setShowJustSynced(false), 1500)
    return () => window.clearTimeout(t)
  }, [isOnline, queuedCount])

  const offline = !isOnline
  const draining = isOnline && queuedCount > 0

  if (!offline && !draining && !showJustSynced) return null

  let label = ''
  if (offline) {
    label =
      queuedCount > 0
        ? `Offline — ${queuedCount} change${queuedCount === 1 ? '' : 's'} will sync when you're back online`
        : `Offline — changes will sync when you're back online`
  } else if (draining) {
    label = `Syncing ${queuedCount} change${queuedCount === 1 ? '' : 's'}…`
  } else {
    label = 'Back online'
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-border-default/60 bg-accent/10 text-text-primary border-b px-4 py-2 text-[13px] leading-snug"
    >
      {label}
    </div>
  )
}

export default OfflineBanner

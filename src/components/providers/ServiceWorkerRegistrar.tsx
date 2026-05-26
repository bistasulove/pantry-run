'use client'

import { useEffect } from 'react'

// Registers /sw.js on mount. Runs in both dev and production — dev was
// excluded originally to avoid HMR interference, but in practice Next's HMR
// runs over WebSocket (not fetch) and the SW's stale-while-revalidate only
// returns cached responses for URLs it has seen before, which new dev-build
// hashes never are. Registering in dev unblocks push-notification testing
// (M16) without a separate `npm run build && npm run start` cycle.
// One-time effect: the browser dedupes register() calls for the same script URL,
// so re-mounts are a no-op rather than an error.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        console.warn('[sw] registration failed', err)
      }
    }

    // window load → don't compete with initial paint / hydration work.
    if (document.readyState === 'complete') {
      void register()
      return
    }
    const onLoad = () => void register()
    window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}

export default ServiceWorkerRegistrar

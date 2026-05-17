'use client'

import { useEffect } from 'react'

// Registers /sw.js on mount. Production-only — registering during `next dev`
// fights HMR because the SW would intercept dev-server asset requests.
// One-time effect: the browser dedupes register() calls for the same script URL,
// so re-mounts are a no-op rather than an error.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
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

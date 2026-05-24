'use client'

import { useEffect, useState } from 'react'

import { SPLASH_MESSAGES } from '@/lib/splash-messages'

function pickMessage(): string {
  return SPLASH_MESSAGES[Math.floor(Math.random() * SPLASH_MESSAGES.length)]
}

// Full-screen overlay rendered in the root layout, covering the cold-start
// gap between first HTML paint and React hydration. Only ever mounts once per
// page load — client-side navigation reuses the same root layout, so the
// splash stays hidden after the initial fade-out.
export function AppSplash() {
  // useState init runs once on the server and once on the client; the picks
  // may differ, which is fine — the message visible to the user is the
  // client's choice after hydration. suppressHydrationWarning silences the
  // React mismatch warning on the message text only.
  const [message] = useState(pickMessage)
  const [hidden, setHidden] = useState(false)
  const [unmounted, setUnmounted] = useState(false)

  useEffect(() => {
    // Guaranteed minimum visible window. A fast iPhone PWA can hydrate
    // within a frame of HTML paint, and the global prefers-reduced-motion
    // rule in globals.css collapses every transition to 0.01ms — so a
    // rAF-only trigger would render the splash imperceptibly short for a
    // sizeable chunk of users. 700ms is long enough to read the one-liner
    // and notice the spinner, short enough not to feel intrusive when
    // everything else is warm.
    const MIN_VISIBLE_MS = 700
    const FADE_MS = 350
    const fadeId = window.setTimeout(() => setHidden(true), MIN_VISIBLE_MS)
    const unmountId = window.setTimeout(() => setUnmounted(true), MIN_VISIBLE_MS + FADE_MS)

    // iOS bfcache: when the PWA is restored from memory (swipe-up away and
    // back), pageshow fires with persisted=true and the existing React tree
    // is reused — including any already-unmounted splash state. Re-show on
    // restore so returning users still get the loading hint.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setUnmounted(false)
      setHidden(false)
      window.setTimeout(() => setHidden(true), MIN_VISIBLE_MS)
      window.setTimeout(() => setUnmounted(true), MIN_VISIBLE_MS + FADE_MS)
    }
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.clearTimeout(fadeId)
      window.clearTimeout(unmountId)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  if (unmounted) return null

  return (
    <div aria-hidden className={hidden ? 'app-splash app-splash--hidden' : 'app-splash'}>
      <div className="app-splash-spinner" />
      <p className="app-splash-message" suppressHydrationWarning>
        {message}
      </p>
    </div>
  )
}

export default AppSplash

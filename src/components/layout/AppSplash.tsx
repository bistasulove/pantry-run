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
    // rAF guarantees one paint with the splash visible before the fade
    // begins — without it, a fast hydration can flip `hidden` to true
    // before the browser ever paints opacity:1, and the user sees nothing.
    const rafId = requestAnimationFrame(() => setHidden(true))
    // Drop the node entirely once the fade has finished so it can't catch
    // stray pointer events or screen-reader focus.
    const unmountId = window.setTimeout(() => setUnmounted(true), 800)
    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(unmountId)
    }
  }, [])

  if (unmounted) return null

  return (
    <div aria-hidden className={`app-splash${hidden ? 'app-splash--hidden' : ''}`}>
      <div className="app-splash-spinner" />
      <p className="app-splash-message" suppressHydrationWarning>
        {message}
      </p>
    </div>
  )
}

export default AppSplash

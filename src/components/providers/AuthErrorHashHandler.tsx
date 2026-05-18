'use client'

import { useState, useSyncExternalStore } from 'react'

import { Toast, type ToastOptions } from '@/components/ui/Toast'

interface ParsedError {
  code: string
  description: string | null
}

// Reads any Supabase auth error fragment captured by the inline script in
// app/layout.tsx (which runs synchronously in <head> so it's not affected by
// service-worker caching, React hydration timing, or the Supabase client's
// auto URL detection). The script moves `#error=...` into sessionStorage
// and clears the URL; this component drains sessionStorage on mount.
//
// Three lifecycle constraints have to hold simultaneously:
//
// 1. SSR-safe: on the server, sessionStorage doesn't exist — bail to null.
// 2. Hydration-clean: the first client render must match server output
//    (also null), otherwise React throws a hydration mismatch error
//    because Toast's portal renders content the server never produced.
// 3. StrictMode-safe: in dev, React mounts → unmounts → remounts. The
//    first mount's state is discarded, so if we called setToast there
//    after removing the storage entry, the visible second mount would
//    find nothing and never show the toast.
//
// useSyncExternalStore with a getServerSnapshot of `false` satisfies (1)
// and (2): server and first-client render both see `mounted = false` and
// return null. After hydration, getSnapshot returns true, re-render
// happens, and we consume sessionStorage at module scope so the StrictMode
// remount gets the cached value rather than re-reading empty storage. (3)
// is covered by the module-level `cachedToast`.
const STORAGE_KEY = 'pantry-run:auth-error-hash'

function parseHash(hash: string): ParsedError | null {
  if (!hash || hash.length <= 1) return null
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(trimmed)
  const error = params.get('error')
  const errorCode = params.get('error_code')
  if (!error && !errorCode) return null
  return {
    code: errorCode ?? error ?? 'unknown',
    description: params.get('error_description'),
  }
}

function friendlyMessage(parsed: ParsedError): string {
  if (parsed.code === 'otp_expired') {
    return 'That confirmation link expired. Open Settings → Account to request a new one, or sign in if you have an account.'
  }
  if (parsed.code === 'access_denied') {
    return 'That link is no longer valid. Request a new one from Settings → Account.'
  }
  if (parsed.description) {
    return parsed.description
  }
  return "That link didn't work. Try requesting a new one."
}

// `undefined` = not yet attempted, `null` = checked and nothing there,
// `ToastOptions` = found and cached for the StrictMode remount.
let cachedToast: ToastOptions | null | undefined = undefined

function consumeStoredErrorHash(): ToastOptions | null {
  if (cachedToast !== undefined) return cachedToast
  if (typeof window === 'undefined') return null

  let stored: string | null = null
  try {
    stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (stored) window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    cachedToast = null
    return null
  }

  if (!stored) {
    cachedToast = null
    return null
  }

  const parsed = parseHash(stored)
  cachedToast = parsed
    ? // Longer than the default 4s — message is dense, user needs time to act.
      { message: friendlyMessage(parsed), durationMs: 8000 }
    : null
  return cachedToast
}

// useSyncExternalStore "hydrated" probe — getServerSnapshot returns false so
// the server-rendered tree matches the first client render. After hydration,
// getSnapshot returns true and React schedules a re-render which finally
// shows the toast. Same pattern useTheme + useInstallPrompt use elsewhere.
function noopSubscribe(): () => void {
  return () => {}
}

function clientHydratedSnapshot(): boolean {
  return true
}

function serverHydratedSnapshot(): boolean {
  return false
}

export function AuthErrorHashHandler() {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    clientHydratedSnapshot,
    serverHydratedSnapshot,
  )
  const [dismissed, setDismissed] = useState(false)

  if (!hydrated) return null

  const toast = dismissed ? null : consumeStoredErrorHash()
  return <Toast toast={toast} onDismiss={() => setDismissed(true)} />
}

export default AuthErrorHashHandler

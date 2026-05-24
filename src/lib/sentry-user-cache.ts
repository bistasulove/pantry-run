// Persists the hashed Sentry user id across page loads so it can be attached
// to errors that fire during initial paint — before SessionProvider's async
// bootstrap (getSession → SHA-256 digest) finishes. Without this cache, any
// crash that happens on first render would arrive in Sentry with no user.id.
//
// We only ever store the SHA-256 hash, never the raw Supabase user UUID —
// same privacy posture as everything we send to Sentry.
const KEY = 'pr_sentry_uid'

export function getCachedSentryUserId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setCachedSentryUserId(hashedId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, hashedId)
  } catch {
    // localStorage can throw in private-mode Safari; the worst outcome is
    // that first-paint errors stay unattributed until bootstrap completes.
  }
}

export function clearCachedSentryUserId(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Same as above — non-fatal.
  }
}

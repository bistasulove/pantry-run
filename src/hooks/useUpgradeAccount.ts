'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export type UpgradeResult = { ok: true } | { ok: false; error: string; signInHint: boolean }

interface EmailUpgradeInput {
  email: string
  password: string
}

// Map Supabase's raw error messages onto friendly copy + a flag that tells
// the UI whether to offer a /sign-in link. Substring matching is fragile but
// Supabase doesn't surface stable error codes for these cases.
function translateError(message: string): { error: string; signInHint: boolean } {
  const lower = message.toLowerCase()

  if (
    lower.includes('already registered') ||
    lower.includes('already in use') ||
    lower.includes('already exists') ||
    lower.includes('already been taken')
  ) {
    return { error: 'This email is already registered.', signInHint: true }
  }

  if (lower.includes('different from the old') || lower.includes('password should be different')) {
    return {
      error: 'Pick a different password. If this is your existing account, sign in instead.',
      signInHint: true,
    }
  }

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return { error: 'Too many attempts. Wait a minute and try again.', signInHint: false }
  }

  // Weak-password / length / character errors already read fine — pass through.
  return { error: message, signInHint: false }
}

// Online-gated wrapper around the auth call that turns an anonymous session
// into a persistent one. We intentionally don't queue offline upgrades
// (M9 D3): storing the user's plaintext password in IndexedDB to replay later
// is a security regression we're not willing to take. Surface a friendly
// error instead and let the user retry once they're online.
//
// One updateUser({ email, password }) call — NOT split — because Supabase's
// anon-upgrade path requires both fields atomically when email confirmation
// is enabled (the prod-realistic setup): a separate updateUser({ password })
// call would be rejected with "anonymous user without an email or phone"
// since the email hasn't been confirmed yet. The single call queues the
// email confirmation AND sets the password in one transaction.
//
// Side-effect of the single call: if the email is rejected (already taken),
// Supabase still silently applies the password to the anon user. This means
// the SECOND attempt with the same password but a different email fails with
// "password should be different from the old". Escapable by picking any
// different password — translateError surfaces this explicitly.
//
// Google upgrade (linkIdentity) was descoped from M9 to V2 — the architecture
// is ready for it (the /auth/callback route already handles OAuth code
// exchanges), but the dashboard setup (Google Cloud OAuth client + Supabase
// provider config + consent screen) is non-trivial. Re-add as a sibling
// `upgradeWithGoogle` method when V2 brings it back.
export function useUpgradeAccount() {
  const [isPending, setIsPending] = useState(false)

  function requireOnline(): string | null {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'Connect to the internet to save your account.'
    }
    return null
  }

  async function upgradeWithEmail({ email, password }: EmailUpgradeInput): Promise<UpgradeResult> {
    const offline = requireOnline()
    if (offline) return { ok: false, error: offline, signInHint: false }

    const trimmed = email.trim()
    if (!trimmed) return { ok: false, error: 'Enter an email address.', signInHint: false }
    if (password.length < 8) {
      return { ok: false, error: 'Use at least 8 characters.', signInHint: false }
    }

    setIsPending(true)
    const supabase = createClient()
    try {
      // emailRedirectTo points the confirmation link at our callback route so
      // the success path lands on `/auth/callback?code=…` and exchanges the
      // OTP into a session. Without it, Supabase falls back to the project's
      // Site URL — `/` in our config — which redirects to `/welcome` and
      // loses the code (Supabase's failure-path hash still surfaces via
      // AuthErrorHashHandler).
      const emailRedirectTo = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.updateUser(
        { email: trimmed, password },
        { emailRedirectTo },
      )
      if (error) {
        console.error('[useUpgradeAccount] updateUser failed', error)
        return { ok: false, ...translateError(error.message) }
      }
      return { ok: true }
    } finally {
      setIsPending(false)
    }
  }

  return { upgradeWithEmail, isPending }
}

'use client'

import * as Sentry from '@sentry/nextjs'
import type { User } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { hashUserId } from '@/lib/hashUserId'
import { clearCachedSentryUserId, setCachedSentryUserId } from '@/lib/sentry-user-cache'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/userStore'

// Extract a stable provider label from auth.users — Google sign-ins land as
// `google`; email/password ends up as `email`. Anonymous sessions report
// nothing meaningful, so we surface null and let consumers special-case.
function readProvider(user: User): string | null {
  const fromMetadata = user.app_metadata?.provider
  if (typeof fromMetadata === 'string' && fromMetadata !== 'anonymous') return fromMetadata
  return null
}

// Supabase exposes the pending email change under `new_email` on the user
// object — it's set when updateUser({ email }) has been called but the user
// hasn't clicked the confirmation link yet. Not in every published type
// definition, so we read it defensively.
function readPendingEmail(user: User): string | null {
  const value = (user as User & { new_email?: string | null }).new_email
  if (typeof value !== 'string' || value.length === 0) return null
  return value
}

// Track the last user id we've already pushed to Sentry to avoid re-hashing
// (and re-setting) on every pathname-change refresh. The hash is stable for a
// given user, so once set it doesn't need to change until sign-out or switch.
let sentryUserId: string | null = null

function hydrateFromUser(user: User) {
  useUserStore.getState().setUser({
    userId: user.id,
    isAnonymous: user.is_anonymous ?? false,
    email: user.email ?? null,
    pendingEmail: readPendingEmail(user),
    provider: readProvider(user),
    createdAt: user.created_at ?? null,
  })

  if (sentryUserId !== user.id) {
    sentryUserId = user.id
    // Fire-and-forget. Hash lands ~1 frame later; any error firing in the
    // interim falls back to the cached hash from localStorage (set on the
    // previous session by setCachedSentryUserId below).
    void hashUserId(user.id).then((hashed) => {
      Sentry.setUser({ id: hashed })
      setCachedSentryUserId(hashed)
    })
  }
}

function clearSentryUser() {
  sentryUserId = null
  Sentry.setUser(null)
  clearCachedSentryUserId()
}

const AUTH_CALLBACK_PATH = '/auth/callback'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const previousPathnameRef = useRef<string | null>(null)

  // One-time bootstrap + subscribe to client-side auth events (sign-in,
  // sign-out, token refresh, in-tab USER_UPDATED). These cover the flows
  // that happen entirely on the client.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (session?.user) {
        hydrateFromUser(session.user)
      }
      // No session = no auto-anon (M9 D6). Welcome screen creates the anon
      // session at user-action time so sign-out doesn't immediately mint a
      // fresh ghost user.
    }

    bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        hydrateFromUser(session.user)
      } else {
        useUserStore.getState().clearUser()
        clearSentryUser()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  // Refresh user data only around /auth/callback transitions. The original
  // purpose was to catch exchangeCodeForSession's side effects (flipping
  // is_anonymous, clearing new_email) which emit no client-side auth event.
  // Running this on every tab nav added a Supabase round trip per click for
  // no benefit. Gated to "current path is /auth/callback" or "previous path
  // was /auth/callback" so we catch both the arrival and the redirect away.
  //
  // Two-step (getSession then getUser) so signed-out routes don't trigger a
  // network call and log "Auth session missing!" noise. getUser() (vs
  // getSession() alone) hits Supabase's /user endpoint so the returned
  // object always reflects the latest server state — getSession() would
  // return the in-memory cached session which can be stale.
  useEffect(() => {
    const previousPathname = previousPathnameRef.current
    previousPathnameRef.current = pathname
    const isAuthCallback = pathname === AUTH_CALLBACK_PATH
    const wasAuthCallback = previousPathname === AUTH_CALLBACK_PATH
    if (!isAuthCallback && !wasAuthCallback) return

    const supabase = createClient()
    let cancelled = false

    async function refresh() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled || !session) return
      const { data, error } = await supabase.auth.getUser()
      if (cancelled || error || !data.user) return
      hydrateFromUser(data.user)
    }

    refresh()
    return () => {
      cancelled = true
    }
  }, [pathname])

  return <>{children}</>
}

export default SessionProvider

import * as Sentry from '@sentry/nextjs'

import { getCachedSentryUserId } from '@/lib/sentry-user-cache'

// Browser SDK init. Runs once at app boot. Errors-only posture for V1.1:
// no performance traces, no replays, no profiling — see plan.md §11.5 M13.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enabled: process.env.NODE_ENV === 'production',
  })

  // Synchronously attach the cached hash if we have one — covers errors that
  // fire on initial render, before SessionProvider's async bootstrap can set
  // the user. SessionProvider refreshes the cache after every hydrate.
  const cached = getCachedSentryUserId()
  if (cached) {
    Sentry.setUser({ id: cached })
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

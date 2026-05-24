import * as Sentry from '@sentry/nextjs'

// Server (Node runtime) Sentry init. Loaded by src/instrumentation.ts's
// register() hook when NEXT_RUNTIME === 'nodejs'.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
})

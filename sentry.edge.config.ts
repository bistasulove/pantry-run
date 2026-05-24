import * as Sentry from '@sentry/nextjs'

// Edge runtime Sentry init — covers src/proxy.ts and any future edge
// route handlers. Loaded by src/instrumentation.ts when NEXT_RUNTIME === 'edge'.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
})

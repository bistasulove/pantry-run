// Next.js 16 server-side instrumentation entrypoint. Delegates to the
// runtime-specific Sentry config so the Node SDK doesn't load on the Edge
// runtime (and vice versa). Short-circuits when the DSN is unset so local
// dev stays silent.
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs'

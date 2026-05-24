import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
}

// SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN come from env (Vercel project
// settings). If missing locally, source-map upload is skipped silently.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
})

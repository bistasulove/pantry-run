'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Top-level App Router error boundary. Catches errors thrown by the root
// layout itself (where per-route error.tsx boundaries can't reach). Cannot
// reuse ErrorFallback here — it depends on providers/styles that haven't
// mounted at this scope.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'global' },
      contexts: error.digest ? { errorBoundary: { digest: error.digest } } : undefined,
    })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#F7F6F3',
          color: '#1C1C1A',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#6B6860', marginBottom: 16 }}>
            Reload the app to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 14,
              border: 'none',
              background: '#3D8055',
              color: 'white',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  )
}

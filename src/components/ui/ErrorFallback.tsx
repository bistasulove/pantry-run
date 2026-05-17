'use client'

import { AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from './Button'

interface ErrorFallbackProps {
  title?: string
  description?: string
  error: Error & { digest?: string }
  reset: () => void
}

export function ErrorFallback({
  title = 'Something went wrong',
  description = 'We hit an unexpected error. Try again, and if it keeps happening, reload the app.',
  error,
  reset,
}: ErrorFallbackProps) {
  useEffect(() => {
    // Sentry hook lands here in V1.1. For now, surface to the browser console
    // so the dev can copy/paste the stack from devtools.
    console.error('[error-boundary]', error)
  }, [error])

  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-8 text-center"
    >
      <div className="bg-bg-surface border-border-default flex w-full flex-col items-center gap-4 rounded-xl border p-6">
        <span className="text-destructive">
          <AlertTriangle size={32} strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="text-text-primary font-display text-[20px] leading-snug font-semibold">
          {title}
        </h2>
        <p className="text-text-secondary text-[14px] leading-relaxed">{description}</p>
        {error.digest ? (
          <p className="text-text-secondary font-mono text-[12px] leading-snug">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
          <Button variant="primary" fullWidth onClick={reset}>
            Try again
          </Button>
          <Button variant="secondary" fullWidth onClick={() => window.location.reload()}>
            Reload app
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ErrorFallback

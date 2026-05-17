'use client'

import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      title="Settings couldn't load"
      description="Try again, or reload the app if this keeps happening."
      error={error}
      reset={reset}
    />
  )
}

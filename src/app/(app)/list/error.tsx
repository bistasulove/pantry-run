'use client'

import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function ListError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      title="The list couldn't load"
      description="Your items are safe on the server. Try again, or reload the app if this keeps happening."
      error={error}
      reset={reset}
    />
  )
}

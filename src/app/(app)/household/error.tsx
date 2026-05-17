'use client'

import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function HouseholdError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      title="Household info couldn't load"
      description="Your household is still there — this is just a display hiccup. Try again, or reload the app."
      error={error}
      reset={reset}
    />
  )
}

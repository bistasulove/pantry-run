'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/userStore'

export default function WelcomePage() {
  const router = useRouter()
  const storedName = useUserStore((state) => state.displayName) ?? ''
  const setDisplayName = useUserStore((state) => state.setDisplayName)
  const [name, setName] = useState(storedName)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedName = name.trim().slice(0, 40)
  const isValid = trimmedName.length > 0

  async function ensureAnonSession(): Promise<boolean> {
    // SessionProvider no longer auto-mints an anon session on mount (M9 D6),
    // so the first-time user gets one here when they commit to onboarding.
    // Returning users already have a session — getSession short-circuits.
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user) return true

    const { error: signInError } = await supabase.auth.signInAnonymously()
    if (signInError) {
      console.error('[welcome] anonymous sign-in failed', signInError)
      setError("Couldn't get you started. Check your connection and try again.")
      return false
    }
    return true
  }

  async function persistAndGo(path: '/create' | '/join') {
    if (!isValid || submitting) return
    setError(null)
    setSubmitting(true)
    setDisplayName(trimmedName)
    const ok = await ensureAnonSession()
    if (!ok) {
      setSubmitting(false)
      return
    }
    router.push(path)
  }

  return (
    <main className="bg-bg-base flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-text-primary text-[32px] leading-tight font-bold">
            Pantry Run
          </h1>
          <p className="text-text-secondary text-[16px] leading-relaxed">
            A shared shopping list for your household.
          </p>
        </header>

        <Input
          label="Your first name"
          hint="Shown next to items you add so other members know who's who."
          autoComplete="given-name"
          maxLength={40}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => persistAndGo('/create')}
            variant="primary"
            fullWidth
            disabled={!isValid || submitting}
          >
            {submitting ? 'Connecting…' : 'Create a household'}
          </Button>
          <Button
            onClick={() => persistAndGo('/join')}
            variant="secondary"
            fullWidth
            disabled={!isValid || submitting}
          >
            Join with a code
          </Button>
        </div>

        <p className="text-text-secondary text-center text-[14px] leading-relaxed">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-accent font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

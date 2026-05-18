'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export function ResetPasswordRequestForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password/new')}`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    })
    setSubmitting(false)
    if (resetError) {
      console.error('[ResetPasswordRequestForm] resetPasswordForEmail failed', resetError)
      // Don't leak whether the email exists — show a generic failure only for
      // network/throttle errors. Account-not-found returns success in Supabase
      // by default, which is what we want.
      setError("Couldn't send the email. Try again in a minute.")
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-text-primary text-[16px] leading-relaxed">
          If that email is on an account, a reset link is on its way.
        </p>
        <Link
          href="/sign-in"
          className="text-accent text-[14px] leading-relaxed font-medium underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="off"
        spellCheck={false}
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />
      <div className="flex flex-col gap-2">
        <Button type="submit" variant="primary" fullWidth disabled={submitting || !email.trim()}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
        <Link
          href="/sign-in"
          className="text-text-secondary text-center text-[13px] leading-snug font-medium"
        >
          Back
        </Link>
      </div>
    </form>
  )
}

export default ResetPasswordRequestForm

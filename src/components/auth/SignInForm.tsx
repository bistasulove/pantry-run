'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { createClient } from '@/lib/supabase/client'

function callbackErrorCopy(code: string | null): string | null {
  if (!code) return null
  if (code === 'callback_missing_code' || code === 'callback_failed') {
    return "Sign-in link didn't work. Try again."
  }
  return null
}

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackError = callbackErrorCopy(searchParams.get('error'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(callbackError)

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) {
      // Generic copy so we don't leak which half (email or password) was wrong —
      // also covers unverified-email rejections without disclosing account existence.
      setError('Email or password is incorrect.')
      setSubmitting(false)
      return
    }
    // (app) layout server-side checks membership and redirects to /welcome if
    // the user has no household yet.
    router.refresh()
    router.push('/list')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
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
      />
      <PasswordInput
        label="Password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error}
      />
      <Button type="submit" variant="primary" fullWidth disabled={!canSubmit}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
      <div className="flex items-center justify-between text-[13px] leading-snug">
        <Link href="/reset-password" className="text-accent font-medium">
          Forgot password?
        </Link>
        <Link href="/welcome" className="text-text-secondary font-medium">
          Back
        </Link>
      </div>
    </form>
  )
}

export default SignInForm

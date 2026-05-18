'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { createClient } from '@/lib/supabase/client'

export function NewPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = password.length >= 8 && password === confirm && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) {
      if (password.length < 8) setError('Use at least 8 characters.')
      else if (password !== confirm) setError("Passwords don't match.")
      return
    }
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) {
      console.error('[NewPasswordForm] updateUser failed', updateError)
      // Most common failure is "no recovery session" — surface as a hint to
      // restart the flow rather than the raw Supabase message.
      setError("Couldn't save. Try the reset link again or request a new one.")
      return
    }
    router.refresh()
    router.replace('/list')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PasswordInput
        label="New password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordInput
        label="Confirm new password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={error}
      />
      <Button type="submit" variant="primary" fullWidth disabled={!canSubmit}>
        {submitting ? 'Saving…' : 'Save new password'}
      </Button>
    </form>
  )
}

export default NewPasswordForm

'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Sheet } from '@/components/ui/Sheet'
import { useUpgradeAccount } from '@/hooks/useUpgradeAccount'

interface UpgradeAccountSheetProps {
  open: boolean
  onClose: () => void
  onUpgraded: (message: string) => void
}

interface ActionableError {
  message: string
  signInHint: boolean
}

export function UpgradeAccountSheet({ open, onClose, onUpgraded }: UpgradeAccountSheetProps) {
  const { upgradeWithEmail, isPending } = useUpgradeAccount()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ActionableError | null>(null)

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isPending

  function close() {
    if (isPending) return
    setEmail('')
    setPassword('')
    setError(null)
    onClose()
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    const result = await upgradeWithEmail({ email, password })
    if (!result.ok) {
      setError({ message: result.error, signInHint: result.signInHint })
      return
    }
    // Supabase has flipped is_anonymous → false on the server already. Banner
    // hides immediately via the auth listener; the confirmation link lets the
    // user verify the new address later (required for password sign-in on
    // other devices).
    setEmail('')
    setPassword('')
    onUpgraded(`Check your inbox at ${email.trim()} to finish saving your account.`)
    onClose()
  }

  return (
    <Sheet open={open} onClose={close} title="Save your account">
      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Add an email and password to access your list on other devices.
        </p>
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
          disabled={isPending}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          required
          minLength={8}
          hint={error ? undefined : 'At least 8 characters.'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
        />

        {error ? (
          <div
            role="alert"
            className="border-destructive/40 bg-destructive/5 text-text-primary flex flex-col gap-2 rounded-xl border px-3 py-2 text-[13px] leading-snug"
          >
            <p className="text-destructive">{error.message}</p>
            {error.signInHint ? (
              <Link
                href="/sign-in"
                onClick={close}
                className="text-accent self-start text-[13px] font-semibold tracking-wide uppercase"
              >
                Sign in instead →
              </Link>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" variant="primary" fullWidth disabled={!canSubmit}>
          {isPending ? 'Saving…' : 'Save account'}
        </Button>

        <Button type="button" onClick={close} variant="ghost" fullWidth disabled={isPending}>
          Not now
        </Button>
      </form>
    </Sheet>
  )
}

export default UpgradeAccountSheet

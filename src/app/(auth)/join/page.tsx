'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSession } from '@/hooks/useSession'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/userStore'

type JoinStatus = 'ok' | 'already_member' | 'expired' | 'not_found'

interface JoinResult {
  status: JoinStatus
  household_id?: string
  household_name?: string
}

function parseJoinResult(value: unknown): JoinResult | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const status = v.status
  if (
    status !== 'ok' &&
    status !== 'already_member' &&
    status !== 'expired' &&
    status !== 'not_found'
  ) {
    return null
  }
  return {
    status,
    household_id: typeof v.household_id === 'string' ? v.household_id : undefined,
    household_name: typeof v.household_name === 'string' ? v.household_name : undefined,
  }
}

function formatCodeInput(raw: string): string {
  const clean = raw
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6)
  if (clean.length <= 3) return clean
  return `${clean.slice(0, 3)}-${clean.slice(3)}`
}

export default function JoinPage() {
  const router = useRouter()
  const { isAuthenticated } = useSession()
  const displayName = useUserStore((state) => state.displayName)

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const rawCode = code.replace(/[^A-Za-z0-9]/g, '')
  const canSubmit = rawCode.length === 6 && isAuthenticated && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rawCode.length !== 6) {
      setError('Codes are 6 characters long.')
      return
    }
    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('join_household_by_code', {
      p_invite_code: rawCode,
      ...(displayName ? { p_display_name: displayName } : {}),
    })

    if (rpcError) {
      console.error('[join] RPC failed', rpcError)
      setError('Something went wrong. Try again.')
      setSubmitting(false)
      return
    }

    const result = parseJoinResult(data)
    if (!result) {
      setError('Unexpected response from the server. Try again.')
      setSubmitting(false)
      return
    }

    switch (result.status) {
      case 'ok':
      case 'already_member':
        router.refresh()
        router.push('/list')
        return
      case 'expired':
        setError('That code has expired. Ask for a new one.')
        setSubmitting(false)
        return
      case 'not_found':
        setError("We couldn't find that code. Double-check and try again.")
        setSubmitting(false)
        return
    }
  }

  return (
    <main className="bg-bg-base flex min-h-dvh items-center justify-center px-4 py-8">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-text-primary text-[24px] leading-snug font-bold">
            Join a household
          </h1>
          <p className="text-text-secondary text-[16px] leading-relaxed">
            Enter the 6-character code someone shared with you.
          </p>
        </header>

        <Input
          label="Invite code"
          autoComplete="one-time-code"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={7}
          value={code}
          onChange={(e) => setCode(formatCodeInput(e.target.value))}
          error={error}
          autoFocus
          className="text-center font-mono tracking-[0.3em] tabular-nums"
        />

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="primary" fullWidth disabled={!canSubmit}>
            {submitting ? 'Joining…' : isAuthenticated ? 'Join household' : 'Connecting…'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            disabled={submitting}
            onClick={() => router.push('/welcome')}
          >
            Back
          </Button>
        </div>
      </form>
    </main>
  )
}

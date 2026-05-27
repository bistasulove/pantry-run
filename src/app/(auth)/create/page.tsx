'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { InviteCode } from '@/components/household/InviteCode'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSession } from '@/hooks/useSession'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/userStore'

interface CreatedHousehold {
  id: string
  name: string
  invite_code: string
  code_expires_at: string
}

function parseCreatedHousehold(value: unknown): CreatedHousehold | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (
    typeof v.id !== 'string' ||
    typeof v.name !== 'string' ||
    typeof v.invite_code !== 'string' ||
    typeof v.code_expires_at !== 'string'
  ) {
    return null
  }
  return {
    id: v.id,
    name: v.name,
    invite_code: v.invite_code,
    code_expires_at: v.code_expires_at,
  }
}

export default function CreatePage() {
  const router = useRouter()
  const { isAuthenticated } = useSession()
  const displayName = useUserStore((state) => state.displayName)

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<CreatedHousehold | null>(null)

  // Display name is mandatory and lives in the in-memory userStore. A direct
  // hit or refresh on this route bypasses /welcome, so re-route there to
  // collect a name before creating.
  useEffect(() => {
    if (!displayName) router.replace('/welcome')
  }, [displayName, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give your household a name.')
      return
    }
    if (trimmed.length > 80) {
      setError('Keep it under 80 characters.')
      return
    }
    setError(null)
    setSubmitting(true)

    if (!displayName) {
      router.replace('/welcome')
      return
    }
    const supabase = createClient()
    // Auto-detect timezone from the creator's device so a household defaults
    // to a sensible local zone. The RPC validates against pg_timezone_names
    // and falls back to 'Australia/Sydney' if the value is unrecognised.
    const tz =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined
    const { data, error: rpcError } = await supabase.rpc('create_household', {
      p_name: trimmed,
      p_display_name: displayName,
      p_timezone: tz,
    })

    if (rpcError) {
      console.error('[create] RPC failed', rpcError)
      setError('Something went wrong. Try again.')
      setSubmitting(false)
      return
    }

    const household = parseCreatedHousehold(data)
    if (!household) {
      setError('Unexpected response from the server. Try again.')
      setSubmitting(false)
      return
    }

    setCreated(household)
    setSubmitting(false)
  }

  function goToList() {
    router.refresh()
    router.push('/list')
  }

  if (created) {
    return (
      <main className="bg-bg-base flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-sm flex-col gap-8 text-center">
          <header className="flex flex-col gap-2">
            <h1 className="font-display text-text-primary text-[24px] leading-snug font-bold">
              {created.name} is ready
            </h1>
            <p className="text-text-secondary text-[16px] leading-relaxed">
              Share this code so others can join. Codes expire after 24 hours.
            </p>
          </header>

          <InviteCode code={created.invite_code} householdName={created.name} />

          <Button onClick={goToList} variant="primary" fullWidth>
            Go to my list
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-bg-base flex min-h-dvh items-center justify-center px-4 py-8">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-text-primary text-[24px] leading-snug font-bold">
            Create a household
          </h1>
          <p className="text-text-secondary text-[16px] leading-relaxed">
            Pick a name. You&apos;ll get an invite code to share.
          </p>
        </header>

        <Input
          label="Household name"
          autoComplete="off"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
        />

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={submitting || !isAuthenticated}
          >
            {submitting ? 'Creating…' : isAuthenticated ? 'Create household' : 'Connecting…'}
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

'use client'

import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

interface RegenerateInviteCodeButtonProps {
  householdId: string
  // 'primary' for the expired-code recovery case (prominent CTA); 'ghost' for
  // a low-key rotate-on-demand affordance shown alongside a still-valid code.
  variant?: 'primary' | 'ghost'
  label?: string
}

export function RegenerateInviteCodeButton({
  householdId,
  variant = 'primary',
  label,
}: RegenerateInviteCodeButtonProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc('regenerate_invite_code', {
      p_household_id: householdId,
    })
    if (rpcError) {
      console.error('[RegenerateInviteCodeButton] RPC failed', rpcError)
      setError("Couldn't generate a new code. Try again.")
      setSubmitting(false)
      return
    }
    // Refresh the server tree so the new invite_code + code_expires_at flow
    // back into HouseholdView through the layout's fetch.
    router.refresh()
    setSubmitting(false)
  }

  const buttonLabel = label ?? (variant === 'primary' ? 'Generate new code' : 'Regenerate code')

  return (
    <div className="flex flex-col gap-1.5">
      <Button onClick={handleClick} variant={variant} fullWidth disabled={submitting}>
        <RefreshCw size={18} strokeWidth={1.5} aria-hidden />
        {submitting ? 'Generating…' : buttonLabel}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-center text-[12px] leading-snug">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default RegenerateInviteCodeButton

'use client'

import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { createClient } from '@/lib/supabase/client'

interface RemoveMemberButtonProps {
  memberUserId: string
  memberLabel: string
  householdName: string
}

export function RemoveMemberButton({
  memberUserId,
  memberLabel,
  householdName,
}: RemoveMemberButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('household_members')
      .delete()
      .eq('user_id', memberUserId)
    setSubmitting(false)
    if (deleteError) {
      console.error('[RemoveMemberButton] delete failed', deleteError)
      setError("Couldn't remove that member. Try again.")
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Remove ${memberLabel}`}
        className="text-text-secondary hover:text-destructive flex h-11 w-11 shrink-0 items-center justify-center transition-colors duration-150"
      >
        <X size={18} strokeWidth={1.5} aria-hidden />
      </button>

      {open ? (
        <Sheet
          open
          onClose={() => (submitting ? undefined : setOpen(false))}
          title="Remove member?"
        >
          <p className="text-text-secondary mb-4 text-[16px] leading-relaxed">
            Remove <span className="text-text-primary font-semibold">{memberLabel}</span> from{' '}
            <span className="text-text-primary font-semibold">{householdName}</span>? Items they
            added will stay on the list, attributed as &quot;former member.&quot;
          </p>
          {error ? (
            <p role="alert" className="text-destructive mb-3 text-[13px] leading-snug">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button onClick={handleConfirm} variant="destructive" fullWidth disabled={submitting}>
              {submitting ? 'Removing…' : `Remove ${memberLabel}`}
            </Button>
            <Button onClick={() => setOpen(false)} variant="ghost" fullWidth disabled={submitting}>
              Cancel
            </Button>
          </div>
        </Sheet>
      ) : null}
    </>
  )
}

export default RemoveMemberButton

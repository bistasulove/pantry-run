'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { useSession } from '@/hooks/useSession'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore, type Member } from '@/store/householdStore'
import { useListStore } from '@/store/listStore'

type LeaveStatus =
  | 'left'
  | 'transferred_and_left'
  | 'needs_transfer'
  | 'invalid_successor'
  | 'not_a_member'
  | 'unauthenticated'

interface LeaveResult {
  status: LeaveStatus
}

function parseLeaveResult(value: unknown): LeaveResult | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const status = v.status
  if (
    status !== 'left' &&
    status !== 'transferred_and_left' &&
    status !== 'needs_transfer' &&
    status !== 'invalid_successor' &&
    status !== 'not_a_member' &&
    status !== 'unauthenticated'
  ) {
    return null
  }
  return { status }
}

type Stage = 'closed' | 'confirm' | 'transfer'

export function LeaveHouseholdSection() {
  const router = useRouter()
  const { userId } = useSession()
  const householdId = useHouseholdStore((s) => s.householdId)
  const householdName = useHouseholdStore((s) => s.name)

  // Live snapshot fetched at the moment the user opens the flow. The store's
  // members list can be stale (e.g. another owner removed someone while the
  // user sat on /settings), and transferring ownership to a member who's
  // already gone would surface as 'invalid_successor' — better to never offer
  // them in the first place.
  const [liveMembers, setLiveMembers] = useState<Member[]>([])
  const [stage, setStage] = useState<Stage>('closed')
  const [opening, setOpening] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const me = liveMembers.find((m) => m.userId === userId)
  const isOwner = me?.role === 'owner'
  const others = liveMembers.filter((m) => m.userId !== userId)
  const isAloneOwner = isOwner && others.length === 0

  async function openLeaveFlow() {
    if (!householdId || !userId || opening) return
    setOpenError(null)
    setError(null)
    setOpening(true)

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('household_members')
      .select('user_id, role, display_name, joined_at')
      .eq('household_id', householdId)
      .order('joined_at', { ascending: true })

    setOpening(false)

    if (fetchError) {
      console.error('[LeaveHouseholdSection] fresh fetch failed', fetchError)
      setOpenError("Couldn't load latest members. Try again.")
      return
    }

    const fresh: Member[] = (data ?? []).map((m) => ({
      userId: m.user_id,
      role: m.role === 'owner' ? 'owner' : 'member',
      displayName: m.display_name,
      joinedAt: m.joined_at,
    }))

    const freshMe = fresh.find((m) => m.userId === userId)
    if (!freshMe) {
      // We're not in the household anymore — someone removed us, or our row
      // vanished. Bounce out so we re-onboard.
      router.replace('/welcome')
      return
    }

    setLiveMembers(fresh)
    const freshOthers = fresh.filter((m) => m.userId !== userId)
    const freshIsOwnerWithOthers = freshMe.role === 'owner' && freshOthers.length > 0
    setStage(freshIsOwnerWithOthers ? 'transfer' : 'confirm')
  }

  function close() {
    if (submitting) return
    setStage('closed')
    setError(null)
  }

  async function callLeave(successorUserId: string | null) {
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const args = successorUserId ? { p_new_owner_user_id: successorUserId } : {}
    const { data, error: rpcError } = await supabase.rpc('leave_household', args)

    if (rpcError) {
      console.error('[LeaveHouseholdSection] RPC failed', rpcError)
      setError('Something went wrong. Try again.')
      setSubmitting(false)
      return
    }

    const result = parseLeaveResult(data)
    if (!result) {
      setError('Unexpected response from the server. Try again.')
      setSubmitting(false)
      return
    }

    switch (result.status) {
      case 'left':
      case 'transferred_and_left':
        // Wipe client state so a stale householdId doesn't flash on the way out.
        useHouseholdStore.getState().clearHousehold()
        useListStore.getState().setItems([])
        router.refresh()
        router.replace('/welcome')
        return
      case 'needs_transfer':
        setSubmitting(false)
        setStage('transfer')
        return
      case 'invalid_successor':
        setSubmitting(false)
        setError("That member isn't available anymore. Pick someone else.")
        return
      case 'not_a_member':
      case 'unauthenticated':
        setSubmitting(false)
        router.replace('/welcome')
        return
    }
  }

  return (
    <section className="border-border-default/60 mt-6 border-t pt-6">
      <h3 className="text-text-primary mb-2 text-[17px] leading-normal font-semibold">
        Leave household
      </h3>
      <p className="text-text-secondary mb-3 text-[14px] leading-relaxed">
        You&apos;ll stop seeing this household and its list. Owners are asked to pick a new owner
        first; the last member to leave deletes the household.
      </p>
      {openError ? (
        <p role="alert" className="text-destructive mb-3 text-[13px] leading-snug">
          {openError}
        </p>
      ) : null}
      <Button onClick={openLeaveFlow} variant="destructive" fullWidth disabled={opening}>
        {opening ? 'Checking…' : 'Leave household'}
      </Button>

      {stage === 'confirm' ? (
        <Sheet open onClose={close} title={isAloneOwner ? 'Delete household?' : 'Leave household?'}>
          <p className="text-text-secondary mb-4 text-[16px] leading-relaxed">
            {isAloneOwner ? (
              <>
                You&apos;re the only member of{' '}
                <span className="text-text-primary font-semibold">{householdName}</span>. Leaving
                deletes the household and all of its items.
              </>
            ) : (
              <>
                You&apos;ll lose access to{' '}
                <span className="text-text-primary font-semibold">{householdName}</span>. Items you
                added will stay on the list, attributed to you as a former member.
              </>
            )}
          </p>
          {error ? (
            <p role="alert" className="text-destructive mb-3 text-[13px] leading-snug">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => void callLeave(null)}
              variant="destructive"
              fullWidth
              disabled={submitting}
            >
              {submitting
                ? isAloneOwner
                  ? 'Deleting…'
                  : 'Leaving…'
                : isAloneOwner
                  ? 'Delete household'
                  : 'Leave household'}
            </Button>
            <Button onClick={close} variant="ghost" fullWidth disabled={submitting}>
              Cancel
            </Button>
          </div>
        </Sheet>
      ) : null}

      {stage === 'transfer' ? (
        <Sheet open onClose={close} title="Transfer ownership">
          <p className="text-text-secondary mb-4 text-[16px] leading-relaxed">
            Pick the member who&apos;ll own{' '}
            <span className="text-text-primary font-semibold">{householdName}</span> after you
            leave.
          </p>
          {error ? (
            <p role="alert" className="text-destructive mb-3 text-[13px] leading-snug">
              {error}
            </p>
          ) : null}
          <ul className="bg-bg-surface border-border-default divide-border-default/60 mb-3 divide-y rounded-xl border">
            {others.map((m) => {
              const label = m.displayName?.trim() || 'Member'
              return (
                <li key={m.userId} className="flex items-center justify-between gap-2 px-4 py-2">
                  <span className="text-text-primary text-[16px] leading-relaxed">{label}</span>
                  <Button
                    onClick={() => void callLeave(m.userId)}
                    variant="primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Working…' : 'Make owner & leave'}
                  </Button>
                </li>
              )
            })}
          </ul>
          <Button onClick={close} variant="ghost" fullWidth disabled={submitting}>
            Cancel
          </Button>
        </Sheet>
      ) : null}
    </section>
  )
}

export default LeaveHouseholdSection

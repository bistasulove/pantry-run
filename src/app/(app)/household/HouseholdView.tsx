'use client'

import { InviteCode } from '@/components/household/InviteCode'
import { RegenerateInviteCodeButton } from '@/components/household/RegenerateInviteCodeButton'
import { RemoveMemberButton } from '@/components/household/RemoveMemberButton'

interface HouseholdViewProps {
  id: string
  name: string
  inviteCode: string
  codeExpiresAt: string
  isExpired: boolean
  currentUserId: string
  members: Array<{
    userId: string
    role: string
    displayName: string | null
    joinedAt: string
  }>
}

// "Expires in X" — only called when the code is still valid (parent gates).
function formatRemaining(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  if (diffMs <= 0) return 'expiring now'
  const days = Math.floor(diffMs / 86_400_000)
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000)
  if (days > 0) return `expires in ${days}d ${hours}h`
  if (hours > 0) return `expires in ${hours}h ${minutes}m`
  return `expires in ${minutes}m`
}

export function HouseholdView({
  id,
  name,
  inviteCode,
  codeExpiresAt,
  isExpired,
  currentUserId,
  members,
}: HouseholdViewProps) {
  const currentIsOwner = members.some((m) => m.userId === currentUserId && m.role === 'owner')
  const owner = members.find((m) => m.role === 'owner')
  const ownerLabel = owner?.displayName?.trim() || 'the owner'

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-text-primary text-[24px] leading-snug font-bold">
          {name}
        </h2>
        <p className="text-text-secondary text-[14px] leading-relaxed">
          {isExpired ? 'Your invite code has expired.' : 'Share the code below so others can join.'}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        {isExpired ? (
          currentIsOwner ? (
            <div className="bg-bg-surface border-border-default flex flex-col items-center gap-3 rounded-xl border px-4 py-6 text-center">
              <p className="text-text-secondary text-[14px] leading-relaxed">
                Generate a new 6-character code. The old one stops working immediately.
              </p>
              <div className="w-full max-w-xs">
                <RegenerateInviteCodeButton householdId={id} variant="primary" />
              </div>
            </div>
          ) : (
            <div className="bg-bg-surface border-border-default rounded-xl border px-4 py-6 text-center">
              <p className="text-text-primary text-[16px] leading-relaxed">
                Ask <span className="font-semibold">{ownerLabel}</span> to generate a new invite
                code.
              </p>
            </div>
          )
        ) : (
          <>
            <InviteCode code={inviteCode} householdName={name} />
            <p className="text-text-secondary text-center text-[12px] leading-snug">
              Code {formatRemaining(codeExpiresAt)}.
            </p>
            {currentIsOwner ? (
              <div className="mx-auto w-full max-w-xs">
                <RegenerateInviteCodeButton householdId={id} variant="ghost" label="Rotate code" />
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-text-primary text-[17px] leading-normal font-semibold">
          Members ({members.length})
        </h3>
        <ul className="bg-bg-surface border-border-default divide-border-default/60 divide-y rounded-xl border">
          {members.map((m) => {
            const isMe = m.userId === currentUserId
            const label = m.displayName?.trim() || (isMe ? 'You' : 'Member')
            const showRemove = currentIsOwner && !isMe
            return (
              <li key={m.userId} className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="text-text-primary text-[16px] leading-relaxed">
                  {label}
                  {isMe ? <span className="text-text-secondary"> · you</span> : null}
                </span>
                <span className="flex items-center gap-2">
                  {m.role === 'owner' ? (
                    <span className="text-text-secondary border-border-default rounded-lg border px-2 py-0.5 text-[12px] leading-snug font-medium">
                      Owner
                    </span>
                  ) : null}
                  {showRemove ? (
                    <RemoveMemberButton
                      memberUserId={m.userId}
                      memberLabel={label}
                      householdName={name}
                    />
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export default HouseholdView

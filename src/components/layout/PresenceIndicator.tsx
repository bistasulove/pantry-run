'use client'

import { usePresence } from '@/hooks/usePresence'
import { useHouseholdStore } from '@/store/householdStore'

function formatPresence(names: string[], total: number): string {
  // 3+ others → count only, per design. Showing three names in a small header
  // strip gets cramped fast.
  if (total >= 3) return `${total} others are here`
  if (total === 2) return `${names[0]} and ${names[1]} are here`
  return `${names[0]} is here`
}

export function PresenceIndicator() {
  const others = usePresence()
  const members = useHouseholdStore((s) => s.members)
  if (others.length === 0) return null

  // Presence payload's displayName can be empty when a peer's userStore hadn't
  // hydrated at track time. The household members list is the source of truth
  // (kept fresh by HouseholdMembersRealtime), so we look it up by userId first
  // and only fall back to the presence payload / "Someone" if the member is
  // missing entirely (defence in depth — shouldn't happen given RLS).
  const names = others.map((o) => {
    const member = members.find((m) => m.userId === o.userId)
    const fromMembers = member?.displayName?.trim()
    if (fromMembers) return fromMembers
    const fromPayload = o.displayName?.trim()
    if (fromPayload) return fromPayload
    return 'Someone'
  })

  return (
    <p
      aria-live="polite"
      className="text-text-secondary flex items-center gap-1.5 px-4 pb-2 text-[12px] leading-snug"
    >
      <span aria-hidden className="bg-accent inline-block h-1.5 w-1.5 rounded-full" />
      <span className="truncate">{formatPresence(names, others.length)}</span>
    </p>
  )
}

export default PresenceIndicator

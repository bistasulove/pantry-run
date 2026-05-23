'use client'

import { usePresence, type PresenceMember } from '@/hooks/usePresence'
import { useHouseholdStore } from '@/store/householdStore'

interface ResolvedPeer {
  name: string
  listName: string | null // null === same list as viewer === "is here"
}

function formatPresence(peers: ResolvedPeer[]): string {
  // 3+ others is too crowded to enumerate per design — collapse to a count.
  // "Active" reads cleanly whether or not everyone's on the same list.
  if (peers.length >= 3) return `${peers.length} others are active`

  const labels = peers.map((p) =>
    p.listName ? `${p.name} is in ${p.listName}` : `${p.name} is here`,
  )

  if (peers.length === 1) return labels[0]

  // Two peers — try to combine into one phrase when both are on the same
  // location (here, or the same other list); otherwise just join with " · ".
  const [a, b] = peers
  if (a.listName === b.listName) {
    return a.listName
      ? `${a.name} and ${b.name} are in ${a.listName}`
      : `${a.name} and ${b.name} are here`
  }
  return `${labels[0]} · ${labels[1]}`
}

function resolvePeer(
  other: PresenceMember,
  members: Array<{ userId: string; displayName: string | null }>,
  lists: Array<{ id: string; name: string }>,
  activeListId: string | null,
): ResolvedPeer {
  // Presence payload's displayName can be empty when a peer's userStore hadn't
  // hydrated at track time. The household members list is the source of truth
  // (kept fresh by HouseholdMembersRealtime), so we look it up by userId first
  // and only fall back to the presence payload / "Someone".
  const member = members.find((m) => m.userId === other.userId)
  const name = member?.displayName?.trim() || other.displayName?.trim() || 'Someone'

  if (!other.listId || other.listId === activeListId) {
    return { name, listName: null }
  }
  const list = lists.find((l) => l.id === other.listId)
  // If we can't resolve the list (deleted between their track and our render),
  // fall back to "here" — better than a stale or empty label.
  return { name, listName: list?.name ?? null }
}

export function PresenceIndicator() {
  const others = usePresence()
  const members = useHouseholdStore((s) => s.members)
  const lists = useHouseholdStore((s) => s.lists)
  const activeListId = useHouseholdStore((s) => s.activeListId)
  if (others.length === 0) return null

  const peers = others.map((o) => resolvePeer(o, members, lists, activeListId))

  return (
    <p
      aria-live="polite"
      className="text-text-secondary flex items-center gap-1.5 px-4 pb-2 text-[12px] leading-snug"
    >
      <span aria-hidden className="bg-accent inline-block h-1.5 w-1.5 rounded-full" />
      <span className="truncate">{formatPresence(peers)}</span>
    </p>
  )
}

export default PresenceIndicator

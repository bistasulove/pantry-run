'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useHousehold } from '@/hooks/useHousehold'
import { useSession } from '@/hooks/useSession'

// Surfaced for members who joined before display names were required. The
// hint sticks until they set a name in Settings — at which point the member
// row update reflects on next page load and the banner disappears.
export function MissingNameBanner() {
  const { userId } = useSession()
  const { members } = useHousehold()
  const pathname = usePathname()

  if (!userId) return null
  const me = members.find((m) => m.userId === userId)
  // members[] is hydrated server-side; if it's empty we haven't loaded yet.
  if (!me) return null
  const hasName = (me.displayName ?? '').trim().length > 0
  if (hasName) return null
  // Don't nag the user while they're on the page that fixes it.
  if (pathname === '/settings') return null

  return (
    <div className="border-border-default/60 bg-accent/10 text-text-primary border-b px-4 py-2 text-[13px] leading-snug">
      <Link href="/settings" className="text-accent flex items-center justify-between gap-3">
        <span>Set your name so others know who&apos;s who.</span>
        <span className="shrink-0 font-semibold tracking-wide uppercase">Set name</span>
      </Link>
    </div>
  )
}

export default MissingNameBanner

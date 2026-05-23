'use client'

import { Users } from 'lucide-react'

import { ListSwitcherTrigger } from '@/components/list/ListSwitcherTrigger'
import { useHousehold } from '@/hooks/useHousehold'

import { PresenceIndicator } from './PresenceIndicator'
import { SyncIndicator } from './SyncIndicator'

export function Header() {
  const { members } = useHousehold()
  const memberCount = members.length

  return (
    <header className="border-border-default/60 bg-bg-base/95 supports-[backdrop-filter]:bg-bg-base/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <ListSwitcherTrigger />
        <div className="flex items-center gap-2">
          <SyncIndicator />
          <div
            aria-label={`${memberCount} member${memberCount === 1 ? '' : 's'}`}
            className="bg-bg-surface border-border-default text-text-secondary flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] leading-snug"
          >
            <Users size={18} strokeWidth={1.5} aria-hidden />
            <span className="tabular-nums">{memberCount}</span>
          </div>
        </div>
      </div>
      <PresenceIndicator />
    </header>
  )
}

export default Header

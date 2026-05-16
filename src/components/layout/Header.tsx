'use client'

import { Users } from 'lucide-react'

import { useHousehold } from '@/hooks/useHousehold'

export function Header() {
  const { name, members } = useHousehold()
  const memberCount = members.length

  return (
    <header className="border-border-default/60 bg-bg-base/95 supports-[backdrop-filter]:bg-bg-base/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <h1 className="font-display text-text-primary truncate text-[20px] leading-snug font-semibold">
          {name ?? 'Your household'}
        </h1>
        <div
          aria-label={`${memberCount} member${memberCount === 1 ? '' : 's'}`}
          className="bg-bg-surface border-border-default text-text-secondary flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] leading-snug"
        >
          <Users size={18} strokeWidth={1.5} aria-hidden />
          <span className="tabular-nums">{memberCount}</span>
        </div>
      </div>
    </header>
  )
}

export default Header

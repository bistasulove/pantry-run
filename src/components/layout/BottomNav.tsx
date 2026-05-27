'use client'

import { Calendar, Clock, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { AvatarMenuChip } from '@/components/layout/AvatarMenuChip'
import { AvatarMenuSheet } from '@/components/layout/AvatarMenuSheet'
import { useUserStore } from '@/store/userStore'

// V2 nav refactor (plan.md §11.6.1) — tab count stays 4 by moving Household
// + Settings into the Avatar menu sheet. Plan tab replaces Household's slot;
// Avatar tab replaces Settings'. Activity (M19) lands in the Header bell.
const TABS = [
  { href: '/list', label: 'List', Icon: Home },
  { href: '/plan', label: 'Plan', Icon: Calendar },
  { href: '/history', label: 'History', Icon: Clock },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const userId = useUserStore((s) => s.userId)
  const displayName = useUserStore((s) => s.displayName)
  const [menuOpen, setMenuOpen] = useState(false)

  // The avatar slot is "active" whenever the user is in one of the routes the
  // menu deep-links into. Keeps the chip from looking unselected when the
  // user is reading their own Settings.
  const onMenuRoute =
    pathname?.startsWith('/household') || pathname?.startsWith('/settings') || false

  return (
    <>
      <nav
        aria-label="Primary"
        className="border-border-default/60 bg-bg-surface/95 sticky bottom-0 z-30 border-t backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="grid grid-cols-4">
          {TABS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[12px] leading-snug transition-colors duration-150 ${
                    active ? 'text-accent' : 'text-text-secondary'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.5} aria-hidden />
                  <span className={active ? 'font-semibold' : 'font-medium'}>{label}</span>
                </Link>
              </li>
            )
          })}
          <li className="flex">
            <AvatarMenuChip
              userId={userId}
              displayName={displayName}
              active={onMenuRoute || menuOpen}
              onClick={() => setMenuOpen(true)}
            />
          </li>
        </ul>
      </nav>
      <AvatarMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}

export default BottomNav

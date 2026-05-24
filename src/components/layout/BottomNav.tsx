'use client'

import { Clock, Home, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/list', label: 'List', Icon: Home },
  { href: '/history', label: 'History', Icon: Clock },
  { href: '/household', label: 'Household', Icon: Users },
  { href: '/settings', label: 'Settings', Icon: Settings },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
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
      </ul>
    </nav>
  )
}

export default BottomNav

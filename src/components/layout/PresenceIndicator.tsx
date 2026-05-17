'use client'

import { usePresence } from '@/hooks/usePresence'

function formatPresence(names: string[]): string {
  if (names.length === 1) return `${names[0]} is here`
  if (names.length === 2) return `${names[0]} and ${names[1]} are here`
  return `${names[0]}, ${names[1]} +${names.length - 2} here`
}

export function PresenceIndicator() {
  const others = usePresence()
  if (others.length === 0) return null

  const names = others.map((m) => m.displayName?.trim() || 'Someone')

  return (
    <p
      aria-live="polite"
      className="text-text-secondary flex items-center gap-1.5 px-4 pb-2 text-[12px] leading-snug"
    >
      <span aria-hidden className="bg-accent inline-block h-1.5 w-1.5 rounded-full" />
      <span className="truncate">{formatPresence(names)}</span>
    </p>
  )
}

export default PresenceIndicator

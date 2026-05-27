'use client'

// Design system §7.19 — first concrete implementation lands with M17.
//
// Identity chip used in the BottomNav (V2 nav refactor). Tap opens the Avatar
// menu sheet (Household, Settings, Notifications, Sign out). The chip itself
// renders a coloured circle with the user's initial, where the colour is
// derived deterministically from user.id so a member's avatar looks the same
// for everyone in the household.
//
// Tap target is the surrounding 56px tab cell (BottomNav), not the chip
// itself — the chip is 36px visually and the cell provides the 44px+ tap
// area. The button here has `aria-label="Open menu"` for screen readers.

interface AvatarMenuChipProps {
  userId: string | null
  displayName: string | null
  active: boolean
  onClick: () => void
}

// Eight muted tints from the design palette. Choosing among a small fixed
// set (vs. arbitrary hue rotation) avoids hard-to-read combinations against
// the white-on-tint avatar text.
const AVATAR_PALETTE = [
  'bg-[#3D8055]', // accent green
  'bg-[#8C6B3A]', // honey
  'bg-[#7B5EA7]', // amethyst
  'bg-[#2E6F8E]', // teal-blue
  'bg-[#B3553B]', // terracotta
  'bg-[#5D6A4A]', // moss
  'bg-[#A14B6F]', // mulberry
  'bg-[#4F6C8C]', // slate-blue
] as const

function paletteIndex(userId: string | null): number {
  if (!userId) return 0
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % AVATAR_PALETTE.length
}

function initial(displayName: string | null): string {
  if (!displayName) return '?'
  const trimmed = displayName.trim()
  if (trimmed.length === 0) return '?'
  return trimmed[0].toUpperCase()
}

export function AvatarMenuChip({ userId, displayName, active, onClick }: AvatarMenuChipProps) {
  const tint = AVATAR_PALETTE[paletteIndex(userId)]
  return (
    <button
      type="button"
      aria-label="Open menu"
      aria-haspopup="dialog"
      onClick={onClick}
      className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[12px] leading-snug transition-colors duration-150 ${
        active ? 'text-accent' : 'text-text-secondary'
      }`}
    >
      <span
        aria-hidden
        className={`${tint} flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-semibold text-white`}
      >
        {initial(displayName)}
      </span>
      <span className={active ? 'font-semibold' : 'font-medium'}>You</span>
    </button>
  )
}

export default AvatarMenuChip

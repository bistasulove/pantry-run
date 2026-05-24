'use client'

import { ChevronRight } from 'lucide-react'

import type { TripSummary } from '@/hooks/useHistory'
import { useHouseholdStore } from '@/store/householdStore'

interface TripCardProps {
  trip: TripSummary
  onOpen: (trip: TripSummary) => void
}

function formatRelativeDate(iso: string): string {
  const now = new Date()
  const finished = new Date(iso)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfFinished = new Date(
    finished.getFullYear(),
    finished.getMonth(),
    finished.getDate(),
  ).getTime()
  const dayDelta = Math.round((startOfToday - startOfFinished) / 86_400_000)

  const time = finished.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  if (dayDelta === 0) return `Today, ${time}`
  if (dayDelta === 1) return `Yesterday, ${time}`
  if (dayDelta >= 2 && dayDelta <= 6) {
    return `${finished.toLocaleDateString(undefined, { weekday: 'long' })}, ${time}`
  }
  return finished.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: finished.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

export function TripCard({ trip, onOpen }: TripCardProps) {
  const members = useHouseholdStore((s) => s.members)
  const finisher = trip.finishedBy
    ? (members.find((m) => m.userId === trip.finishedBy)?.displayName?.trim() ?? null)
    : null
  const finisherLabel = finisher && finisher.length > 0 ? finisher : 'Someone'
  const listLabel = trip.listName ?? 'Deleted list'
  const itemLabel = `${trip.itemCount} ${trip.itemCount === 1 ? 'item' : 'items'}`

  return (
    <button
      type="button"
      onClick={() => onOpen(trip)}
      className="bg-bg-surface border-border-default flex min-h-[64px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150 hover:bg-[#EEEDE8] dark:hover:bg-[#2E2E30]"
      aria-label={`Shopping trip, ${formatRelativeDate(trip.finishedAt)}, ${itemLabel}, finished by ${finisherLabel}, from ${listLabel}`}
    >
      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <div className="text-text-primary truncate text-[16px] leading-relaxed font-medium">
          {formatRelativeDate(trip.finishedAt)}
        </div>
        <div className="text-text-secondary truncate text-[13px] leading-snug">
          {itemLabel} · {finisherLabel} · {listLabel}
        </div>
      </div>
      <ChevronRight
        size={20}
        strokeWidth={1.5}
        aria-hidden
        className="text-text-secondary shrink-0"
      />
    </button>
  )
}

export default TripCard

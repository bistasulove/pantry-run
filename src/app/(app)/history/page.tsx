'use client'

import { useMemo, useState } from 'react'

import { HistoryEmptyState } from '@/components/history/EmptyState'
import { MonthGroup } from '@/components/history/MonthGroup'
import { TripCard } from '@/components/history/TripCard'
import { TripDetailSheet } from '@/components/history/TripDetailSheet'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { useHistory, type TripSummary } from '@/hooks/useHistory'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

function monthLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString(undefined, {
    month: 'long',
    year: sameYear ? undefined : 'numeric',
  })
}

export default function HistoryPage() {
  const { trips, isLoading, isLoadingMore, hasMore, error, loadMore, refetch } = useHistory()
  const { isOnline } = useNetworkStatus()
  const [selected, setSelected] = useState<TripSummary | null>(null)
  const [toast, setToast] = useState<ToastOptions | null>(null)

  const grouped = useMemo(() => {
    const groups: Array<{ label: string; trips: TripSummary[] }> = []
    for (const trip of trips) {
      const label = monthLabel(trip.finishedAt)
      const last = groups[groups.length - 1]
      if (last && last.label === label) {
        last.trips.push(trip)
      } else {
        groups.push({ label, trips: [trip] })
      }
    }
    return groups
  }, [trips])

  const showOfflineEmpty = !isOnline && trips.length === 0 && !isLoading

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 pt-6 pb-3">
        <h1 className="font-display text-text-primary text-[24px] leading-snug font-bold">
          Shopping history
        </h1>
        <p className="text-text-secondary text-[14px] leading-relaxed">
          Trips you and your household have finished.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {isLoading ? (
          <div
            className="flex flex-col gap-2"
            aria-busy="true"
            aria-label="Loading shopping history"
          >
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error && trips.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <p role="alert" className="text-destructive text-[14px] leading-relaxed">
              {error}
            </p>
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : showOfflineEmpty ? (
          <HistoryEmptyState variant="offline" />
        ) : trips.length === 0 ? (
          <HistoryEmptyState variant="no-trips" />
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map((group) => (
              <MonthGroup key={group.label} label={group.label}>
                {group.trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onOpen={setSelected} />
                ))}
              </MonthGroup>
            ))}

            {hasMore ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  onClick={() => void loadMore()}
                  disabled={isLoadingMore}
                  aria-label="Load older trips"
                >
                  {isLoadingMore ? 'Loading…' : 'Load older trips'}
                </Button>
              </div>
            ) : trips.length > 0 ? (
              <p className="text-text-secondary py-4 text-center text-[13px] leading-snug">
                You&apos;ve reached the start of your history.
              </p>
            ) : null}

            {error && trips.length > 0 ? (
              <p role="alert" className="text-destructive text-center text-[13px] leading-snug">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {selected ? (
        <TripDetailSheet
          key={selected.id}
          trip={selected}
          onClose={() => setSelected(null)}
          onToast={(message) => setToast({ message })}
        />
      ) : null}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

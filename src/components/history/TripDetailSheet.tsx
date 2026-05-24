'use client'

import { Check, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import type { TripSummary } from '@/hooks/useHistory'
import { useList, type RestoreItemSnapshot } from '@/hooks/useList'
import { useTripItems, type TripItem } from '@/hooks/useTripItems'
import { useActiveList } from '@/hooks/useActiveList'
import { useHouseholdStore } from '@/store/householdStore'
import { formatQuantity, isUnitKey } from '@/lib/units'

interface TripDetailSheetProps {
  trip: TripSummary | null
  onClose: () => void
  onToast: (message: string) => void
}

function snapshotFrom(item: TripItem): RestoreItemSnapshot {
  return {
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    quantity_value: item.quantity_value,
    quantity_unit: item.quantity_unit,
    note: item.note,
  }
}

function deriveQuantityDisplay(item: TripItem): string | null {
  if (item.quantity_value != null && isUnitKey(item.quantity_unit)) {
    return formatQuantity(item.quantity_value, item.quantity_unit)
  }
  const legacy = item.quantity?.trim()
  return legacy ? legacy : null
}

function formatHeaderDate(iso: string): string {
  const finished = new Date(iso)
  return finished.toLocaleString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TripDetailSheet({ trip, onClose, onToast }: TripDetailSheetProps) {
  const { items, isLoading, error } = useTripItems(trip?.id ?? null)
  const { restoreItem } = useList()
  const { activeList } = useActiveList()
  const members = useHouseholdStore((s) => s.members)

  // Per-item "added" set so the UI gives explicit feedback after a restore
  // without forcing the user to remember what they already tapped. Parent
  // remounts this component on trip change via `key`, so initial state is
  // always fresh — no reset effect needed here.
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isRestoringAll, setIsRestoringAll] = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)

  if (!trip) return null

  const finisher = trip.finishedBy
    ? (members.find((m) => m.userId === trip.finishedBy)?.displayName?.trim() ?? null)
    : null
  const finisherLabel = finisher && finisher.length > 0 ? finisher : 'Someone'
  const targetListName = activeList?.name ?? 'your list'

  const grouped: Record<string, TripItem[]> = {}
  for (const item of items) {
    const key = item.category || 'Other'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }
  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b))

  async function handleRestoreOne(item: TripItem) {
    if (pendingId || isRestoringAll) return
    setPendingId(item.id)
    const result = await restoreItem(snapshotFrom(item))
    setPendingId(null)
    if (!result.ok) {
      onToast(result.error)
      return
    }
    setRestoredIds((prev) => {
      const next = new Set(prev)
      next.add(item.id)
      return next
    })
    onToast(`Added ${item.name} to ${targetListName}`)
  }

  async function handleRestoreAll() {
    if (isRestoringAll || pendingId) return
    setIsRestoringAll(true)
    const remaining = items.filter((i) => !restoredIds.has(i.id))
    let added = 0
    let firstError: string | null = null
    for (const item of remaining) {
      const result = await restoreItem(snapshotFrom(item))
      if (result.ok) {
        added += 1
        setRestoredIds((prev) => {
          const next = new Set(prev)
          next.add(item.id)
          return next
        })
      } else if (!firstError) {
        firstError = result.error
      }
    }
    setIsRestoringAll(false)
    setConfirmAll(false)
    if (firstError && added === 0) {
      onToast(firstError)
      return
    }
    if (added > 0) {
      const label = added === 1 ? '1 item' : `${added} items`
      onToast(`Added ${label} to ${targetListName}`)
    }
    if (firstError && added > 0) {
      onToast(firstError)
    }
  }

  const allRestored = items.length > 0 && items.every((i) => restoredIds.has(i.id))
  const remainingCount = items.filter((i) => !restoredIds.has(i.id)).length

  return (
    <Sheet open onClose={onClose} title="Shopping trip">
      <div className="flex max-h-[75vh] flex-col">
        <header className="border-border-default/60 mb-3 border-b pb-3">
          <p className="text-text-primary text-[16px] leading-relaxed font-medium">
            {formatHeaderDate(trip.finishedAt)}
          </p>
          <p className="text-text-secondary text-[13px] leading-snug">
            Finished by {finisherLabel} · {trip.listName ?? 'Deleted list'}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto pr-1" aria-busy={isLoading || undefined}>
          {isLoading ? (
            <p className="text-text-secondary py-6 text-center text-[14px] leading-relaxed">
              Loading items…
            </p>
          ) : error ? (
            <p
              role="alert"
              className="text-destructive py-6 text-center text-[14px] leading-relaxed"
            >
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="text-text-secondary py-6 text-center text-[14px] leading-relaxed">
              This trip didn&apos;t include any items.
            </p>
          ) : (
            <ul className="flex flex-col gap-4" role="list">
              {categories.map((category) => (
                <li key={category}>
                  <h3 className="text-text-secondary mb-1.5 text-[13px] leading-snug font-medium tracking-wide uppercase">
                    {category}
                  </h3>
                  <ul className="flex flex-col gap-1.5" role="list">
                    {grouped[category].map((item) => {
                      const quantity = deriveQuantityDisplay(item)
                      const restored = restoredIds.has(item.id)
                      const pending = pendingId === item.id
                      return (
                        <li
                          key={item.id}
                          className="border-border-default flex items-start gap-3 rounded-xl border px-3 py-2.5"
                        >
                          <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-text-primary text-[16px] leading-relaxed">
                                {item.name}
                              </span>
                              {quantity ? (
                                <span className="text-text-secondary text-[14px] leading-relaxed">
                                  {quantity}
                                </span>
                              ) : null}
                            </div>
                            {item.note ? (
                              <span className="text-text-secondary text-[13px] leading-snug">
                                {item.note}
                              </span>
                            ) : null}
                            {item.added_by_name ? (
                              <span className="text-text-secondary text-[12px] leading-snug">
                                Added by {item.added_by_name}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRestoreOne(item)}
                            disabled={restored || pending || isRestoringAll}
                            aria-label={
                              restored
                                ? `${item.name} added to ${targetListName}`
                                : `Add ${item.name} to ${targetListName}`
                            }
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 disabled:cursor-not-allowed ${
                              restored
                                ? 'text-accent bg-accent/10'
                                : 'text-text-secondary hover:bg-[#EEEDE8] disabled:opacity-40 dark:hover:bg-[#2E2E30]'
                            }`}
                          >
                            {restored ? (
                              <Check size={20} strokeWidth={1.5} aria-hidden />
                            ) : (
                              <Plus size={20} strokeWidth={1.5} aria-hidden />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && !isLoading ? (
          <footer className="border-border-default/60 mt-3 border-t pt-3">
            {confirmAll ? (
              <div className="flex flex-col gap-2">
                <p className="text-text-primary text-[14px] leading-relaxed">
                  Restore {remainingCount === 1 ? '1 item' : `${remainingCount} items`} to{' '}
                  <span className="font-semibold">{targetListName}</span>?
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => void handleRestoreAll()}
                    disabled={isRestoringAll}
                    variant="primary"
                  >
                    {isRestoringAll ? 'Restoring…' : 'Restore'}
                  </Button>
                  <Button
                    onClick={() => setConfirmAll(false)}
                    variant="ghost"
                    disabled={isRestoringAll}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setConfirmAll(true)}
                disabled={allRestored || isRestoringAll || pendingId !== null}
                variant="secondary"
                fullWidth
              >
                {allRestored ? 'All items restored' : `Restore all to ${targetListName}`}
              </Button>
            )}
          </footer>
        ) : null}
      </div>
    </Sheet>
  )
}

export default TripDetailSheet

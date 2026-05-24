'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { AddItemBar } from '@/components/list/AddItemBar'
import { CategorySection } from '@/components/list/CategorySection'
import { CheckedSection } from '@/components/list/CheckedSection'
import { EditItemSheet } from '@/components/list/EditItemSheet'
import { EmptyState } from '@/components/list/EmptyState'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { useList } from '@/hooks/useList'
import { CATEGORY_ORDER } from '@/lib/categories'
import type { ListItem } from '@/store/listStore'
import { useListStore } from '@/store/listStore'

const STAPLE_HINT_KEY = 'pr_seen_staple_hint'

export default function ListPage() {
  const {
    items,
    isLoading,
    addItem,
    toggleChecked,
    updateItem,
    deleteItem,
    undoDelete,
    finishShopping,
  } = useList()

  const [editing, setEditing] = useState<ListItem | null>(null)
  const [toast, setToast] = useState<ToastOptions | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)

  // M14 Sentry seam — REMOVE AT CLOSE-OUT.
  // ?__reject=1 fires an unhandled promise rejection so Sentry's default
  // onunhandledrejection global handler captures it (E.3 of m14_test_plan).
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('__reject') === '1') {
      void Promise.reject(new Error('M14 verification: unhandled rejection'))
    }
  }, [searchParams])

  // M14 Sentry seam — REMOVE AT CLOSE-OUT.
  // ?__throw=1 throws synchronously during render so the route ErrorFallback
  // catches it and Sentry.captureException fires with boundary=route (E.2).
  if (searchParams.get('__throw') === '1') {
    throw new Error('M14 verification: route boundary throw')
  }

  const { activeByCategory, checkedItems } = useMemo(() => {
    const checked: ListItem[] = []
    const active = new Map<string, ListItem[]>()
    for (const item of items) {
      if (item.is_checked) {
        checked.push(item)
      } else {
        const bucket = active.get(item.category) ?? []
        bucket.push(item)
        active.set(item.category, bucket)
      }
    }
    for (const bucket of active.values()) {
      bucket.sort((a, b) => b.sort_order - a.sort_order)
    }
    checked.sort((a, b) => {
      const aT = a.checked_at ?? a.updated_at
      const bT = b.checked_at ?? b.updated_at
      return bT.localeCompare(aT)
    })
    return { activeByCategory: active, checkedItems: checked }
  }, [items])

  const hasItems = items.length > 0

  async function handleAdd(name: string) {
    try {
      await addItem(name)
    } catch {
      setToast({ message: "Couldn't add that item. Try again." })
    }
  }

  async function handleToggle(id: string) {
    try {
      await toggleChecked(id)
      // Read store directly so we observe the just-applied optimistic update,
      // not the stale closure of `items` from this render.
      const fresh = useListStore.getState().items
      if (fresh.length > 0 && fresh.every((i) => i.is_checked)) {
        setDoneOpen(true)
      }
    } catch {
      setToast({ message: "Couldn't update that item." })
    }
  }

  async function handleEditSave(
    id: string,
    patch: {
      name?: string
      category?: string
      quantity_value?: number | null
      quantity_unit?: string | null
      note?: string | null
      is_recurring?: boolean
    },
  ) {
    try {
      await updateItem(id, patch)
    } catch {
      setToast({ message: "Couldn't save that item." })
    }
  }

  function handleStapleHint() {
    if (typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(STAPLE_HINT_KEY)) return
      window.localStorage.setItem(STAPLE_HINT_KEY, '1')
    } catch {
      // localStorage can throw in private-mode Safari; surfacing the hint
      // every time in that case is acceptable.
    }
    setToast({ message: 'Staples stay on the list when you finish shopping.' })
  }

  async function handleDelete(id: string) {
    try {
      const removed = await deleteItem(id)
      if (removed) {
        setToast({
          message: `Removed "${removed.name}"`,
          action: {
            label: 'Undo',
            onClick: () => {
              void undoDelete(removed).catch(() =>
                setToast({ message: "Couldn't restore that item." }),
              )
            },
          },
        })
      }
    } catch {
      setToast({ message: "Couldn't delete that item." })
    }
  }

  const checkedToRemove = checkedItems.filter((i) => !i.is_recurring).length
  const checkedToKeep = checkedItems.filter((i) => i.is_recurring).length

  function previewCopy(): string {
    if (checkedItems.length === 0) return 'Nothing to finish yet.'
    if (checkedToRemove > 0 && checkedToKeep > 0) {
      return `${checkedToRemove} item${checkedToRemove === 1 ? '' : 's'} will be removed · ${checkedToKeep} staple${checkedToKeep === 1 ? '' : 's'} will stay.`
    }
    if (checkedToRemove > 0) {
      return `${checkedToRemove} item${checkedToRemove === 1 ? '' : 's'} will be removed.`
    }
    return `${checkedToKeep} staple${checkedToKeep === 1 ? '' : 's'} will stay on the list.`
  }

  function finishedCopy(removed: number, kept: number): string {
    if (removed === 0 && kept === 0) return 'Nothing to finish yet.'
    if (removed > 0 && kept > 0) {
      return `Trip saved · ${removed} removed · ${kept} stay${kept === 1 ? 's' : ''}.`
    }
    if (removed > 0) {
      return `Trip saved · ${removed} item${removed === 1 ? '' : 's'} removed.`
    }
    return `Trip saved · ${kept} staple${kept === 1 ? '' : 's'} stay${kept === 1 ? 's' : ''}.`
  }

  async function handleFinishShopping() {
    if (finishing) return
    setFinishing(true)
    try {
      const result = await finishShopping()
      setDoneOpen(false)
      if (!result.ok) {
        setToast({ message: result.error })
        return
      }
      if (result.removed === 0 && result.kept === 0) return
      setToast({ message: finishedCopy(result.removed, result.kept) })
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div aria-live="polite" aria-busy={isLoading} className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-3 px-4 py-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !hasItems ? (
          <EmptyState />
        ) : (
          <>
            {CATEGORY_ORDER.map((category) => {
              const sectionItems = activeByCategory.get(category) ?? []
              return (
                <CategorySection
                  key={category}
                  category={category}
                  items={sectionItems}
                  onToggle={handleToggle}
                  onEdit={(item) => setEditing(item)}
                  onDelete={handleDelete}
                />
              )
            })}
            <CheckedSection
              items={checkedItems}
              onToggle={handleToggle}
              onEdit={(item) => setEditing(item)}
              onDelete={handleDelete}
              onFinishShopping={() => setDoneOpen(true)}
            />
          </>
        )}
      </div>

      <AddItemBar onAdd={handleAdd} />

      {editing ? (
        <EditItemSheet
          item={editing}
          onClose={() => setEditing(null)}
          onSave={handleEditSave}
          onDelete={handleDelete}
          onStapleHint={handleStapleHint}
        />
      ) : null}

      <Sheet open={doneOpen} onClose={() => setDoneOpen(false)} title="Finish shopping?">
        <p className="text-text-secondary mb-4 text-[16px] leading-relaxed">{previewCopy()}</p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleFinishShopping}
            variant="primary"
            fullWidth
            disabled={checkedItems.length === 0 || finishing}
          >
            {finishing ? 'Finishing…' : 'Finish shopping'}
          </Button>
          <Button onClick={() => setDoneOpen(false)} variant="ghost" fullWidth disabled={finishing}>
            Not yet
          </Button>
        </div>
      </Sheet>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

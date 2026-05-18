'use client'

import { useMemo, useState } from 'react'

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

export default function ListPage() {
  const {
    items,
    isLoading,
    addItem,
    toggleChecked,
    updateItem,
    deleteItem,
    undoDelete,
    clearChecked,
  } = useList()

  const [editing, setEditing] = useState<ListItem | null>(null)
  const [toast, setToast] = useState<ToastOptions | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)

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
    },
  ) {
    try {
      await updateItem(id, patch)
    } catch {
      setToast({ message: "Couldn't save that item." })
    }
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

  async function handleClearChecked() {
    setDoneOpen(false)
    try {
      const cleared = await clearChecked()
      if (cleared.length > 0) {
        setToast({ message: `Cleared ${cleared.length} item${cleared.length === 1 ? '' : 's'}` })
      }
    } catch {
      setToast({ message: "Couldn't clear checked items." })
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
              onClearChecked={() => setDoneOpen(true)}
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
        />
      ) : null}

      <Sheet open={doneOpen} onClose={() => setDoneOpen(false)} title="Done shopping?">
        <p className="text-text-secondary mb-4 text-[16px] leading-relaxed">
          {checkedItems.length > 0
            ? `${checkedItems.length} checked item${checkedItems.length === 1 ? '' : 's'} will be removed.`
            : 'Nothing to clear yet.'}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleClearChecked}
            variant="primary"
            fullWidth
            disabled={checkedItems.length === 0}
          >
            Clear checked items
          </Button>
          <Button onClick={() => setDoneOpen(false)} variant="ghost" fullWidth>
            Not yet
          </Button>
        </div>
      </Sheet>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

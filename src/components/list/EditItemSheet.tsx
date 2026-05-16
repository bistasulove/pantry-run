'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { useHousehold } from '@/hooks/useHousehold'
import { useSession } from '@/hooks/useSession'
import { CATEGORY_ORDER } from '@/lib/categories'
import type { ListItem } from '@/store/listStore'

interface EditItemSheetProps {
  item: ListItem
  onClose: () => void
  onSave: (id: string, patch: { name?: string; category?: string }) => void | Promise<void>
  onDelete: (id: string) => void
}

function describeAdder(
  addedBy: string | null,
  addedByName: string | null,
  currentUserId: string | null,
  members: Array<{ userId: string; displayName: string | null }>,
): string {
  if (!addedBy) return 'Added by a former member'
  if (addedBy === currentUserId) return 'Added by you'
  const member = members.find((m) => m.userId === addedBy)
  if (member) {
    const name = member.displayName?.trim()
    return name ? `Added by ${name}` : 'Added by a member'
  }
  const snapshot = addedByName?.trim()
  return snapshot ? `Added by ${snapshot} (former member)` : 'Added by a former member'
}

// Mounted only while an item is being edited (parent renders conditionally),
// so initial state can derive from the item prop without a sync effect.
export function EditItemSheet({ item, onClose, onSave, onDelete }: EditItemSheetProps) {
  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState<string>(item.category)
  const [submitting, setSubmitting] = useState(false)

  const { userId } = useSession()
  const { members } = useHousehold()
  const addedByLabel = describeAdder(item.added_by, item.added_by_name, userId, members)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    const patch: { name?: string; category?: string } = {}
    if (trimmed !== item.name) patch.name = trimmed
    if (category !== item.category) patch.category = category
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    setSubmitting(true)
    try {
      await onSave(item.id, patch)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  function handleDelete() {
    onDelete(item.id)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Edit item">
      <div className="flex flex-col gap-4">
        <p className="text-text-secondary -mt-1 text-[12px] leading-snug">{addedByLabel}</p>
        <Input
          label="Name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-item-category"
            className="text-text-primary text-[13px] leading-snug font-medium"
          >
            Category
          </label>
          <select
            id="edit-item-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-bg-surface border-border-default text-text-primary focus-visible:outline-accent block min-h-[44px] rounded-xl border px-4 text-[16px] leading-relaxed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={handleSave} variant="primary" fullWidth disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
          <Button onClick={onClose} variant="ghost" fullWidth disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} variant="destructive" fullWidth disabled={submitting}>
            Delete item
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

export default EditItemSheet

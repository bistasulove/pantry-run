'use client'

import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { QuantityInput } from '@/components/list/QuantityInput'
import { Sheet } from '@/components/ui/Sheet'
import { useHousehold } from '@/hooks/useHousehold'
import { useSession } from '@/hooks/useSession'
import { CATEGORY_ORDER } from '@/lib/categories'
import { isUnitKey, type UnitKey } from '@/lib/units'
import type { ListItem } from '@/store/listStore'

const NOTE_MAX_LEN = 280
const NOTE_COUNTER_THRESHOLD = 240

interface EditItemSheetProps {
  item: ListItem
  onClose: () => void
  onSave: (
    id: string,
    patch: {
      name?: string
      category?: string
      quantity_value?: number | null
      quantity_unit?: string | null
      note?: string | null
    },
  ) => void | Promise<void>
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
  const [quantityValue, setQuantityValue] = useState<number | null>(item.quantity_value ?? null)
  const [quantityUnit, setQuantityUnit] = useState<UnitKey | null>(
    isUnitKey(item.quantity_unit) ? item.quantity_unit : null,
  )
  const [note, setNote] = useState(item.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const noteCounterId = useId()

  const { userId } = useSession()
  const { members } = useHousehold()
  const addedByLabel = describeAdder(item.added_by, item.added_by_name, userId, members)

  // Value-only is valid (defaults to `piece` on save). The only invalid combo
  // is a unit picked without a number — there's no sensible default for that.
  const unitWithoutValue = quantityValue === null && quantityUnit !== null
  const quantityError = unitWithoutValue ? 'Add a number to save this quantity.' : null

  const trimmedNoteLen = note.trim().length
  const showNoteCounter = note.length >= NOTE_COUNTER_THRESHOLD
  const noteOverLimit = note.length > NOTE_MAX_LEN

  const canSave = !unitWithoutValue && !noteOverLimit && name.trim().length > 0

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    if (unitWithoutValue || noteOverLimit) return

    // Implicit default: value entered without a unit means "N of these" — store
    // as `piece`, which the UI surfaces as "Qty".
    const effectiveUnit: UnitKey | null =
      quantityValue !== null && quantityUnit === null ? 'piece' : quantityUnit

    const patch: {
      name?: string
      category?: string
      quantity_value?: number | null
      quantity_unit?: string | null
      note?: string | null
    } = {}
    if (trimmedName !== item.name) patch.name = trimmedName
    if (category !== item.category) patch.category = category
    if (quantityValue !== item.quantity_value) patch.quantity_value = quantityValue
    if (effectiveUnit !== item.quantity_unit) patch.quantity_unit = effectiveUnit
    const nextNote = trimmedNoteLen > 0 ? note.trim() : null
    if (nextNote !== item.note) patch.note = nextNote

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

        <QuantityInput
          value={quantityValue}
          unit={quantityUnit}
          onChange={({ value, unit }) => {
            setQuantityValue(value)
            setQuantityUnit(unit)
          }}
          error={quantityError}
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

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-item-note"
            className="text-text-primary text-[13px] leading-snug font-medium"
          >
            Note <span className="text-text-secondary font-normal">(optional)</span>
          </label>
          <textarea
            id="edit-item-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. get the organic one"
            rows={3}
            aria-describedby={showNoteCounter ? noteCounterId : undefined}
            aria-invalid={noteOverLimit || undefined}
            className="bg-bg-surface border-border-default text-text-primary focus-visible:outline-accent block min-h-[88px] resize-y rounded-xl border px-4 py-2.5 text-[16px] leading-relaxed focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          {showNoteCounter ? (
            <span
              id={noteCounterId}
              aria-live="polite"
              className={`self-end text-[12px] leading-snug ${
                noteOverLimit ? 'text-destructive' : 'text-text-secondary'
              }`}
            >
              {note.length} / {NOTE_MAX_LEN}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <Button
            onClick={handleSave}
            variant="primary"
            fullWidth
            disabled={submitting || !canSave}
          >
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

'use client'

import { Repeat } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { QuantityInput } from '@/components/list/QuantityInput'
import { Sheet } from '@/components/ui/Sheet'
import { useHousehold } from '@/hooks/useHousehold'
import { useSession } from '@/hooks/useSession'
import { CATEGORY_ORDER } from '@/lib/categories'
import { normaliseName, upsertHouseholdOverride } from '@/lib/category-overrides'
import { isUnitKey, type UnitKey } from '@/lib/units'
import { useCategoryOverridesStore } from '@/store/categoryOverridesStore'
import { useHouseholdStore } from '@/store/householdStore'
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
      category_pending?: boolean
      quantity_value?: number | null
      quantity_unit?: string | null
      note?: string | null
      is_recurring?: boolean
    },
  ) => void | Promise<void>
  onDelete: (id: string) => void
  // Fired the moment the user toggles "Mark as staple" on (before save). Parent
  // decides whether this is the user's first-ever staple via a localStorage
  // flag and surfaces the one-shot onboarding toast.
  onStapleHint?: () => void
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
export function EditItemSheet({
  item,
  onClose,
  onSave,
  onDelete,
  onStapleHint,
}: EditItemSheetProps) {
  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState<string>(item.category)
  const [quantityValue, setQuantityValue] = useState<number | null>(item.quantity_value ?? null)
  const [quantityUnit, setQuantityUnit] = useState<UnitKey | null>(
    isUnitKey(item.quantity_unit) ? item.quantity_unit : null,
  )
  const [note, setNote] = useState(item.note ?? '')
  const [isRecurring, setIsRecurring] = useState<boolean>(item.is_recurring)
  const [submitting, setSubmitting] = useState(false)
  const noteCounterId = useId()
  const stapleLabelId = useId()
  const stapleDescId = useId()

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
      category_pending?: boolean
      quantity_value?: number | null
      quantity_unit?: string | null
      note?: string | null
      is_recurring?: boolean
    } = {}
    if (trimmedName !== item.name) patch.name = trimmedName
    const categoryChanged = category !== item.category
    if (categoryChanged) {
      patch.category = category
      // M15 — an explicit user pick is a confident answer. Clear the pending
      // flag so the reconnect sweep doesn't re-categorise it back later.
      if (item.category_pending) patch.category_pending = false
    }
    if (quantityValue !== item.quantity_value) patch.quantity_value = quantityValue
    if (effectiveUnit !== item.quantity_unit) patch.quantity_unit = effectiveUnit
    if (isRecurring !== item.is_recurring) patch.is_recurring = isRecurring
    const nextNote = trimmedNoteLen > 0 ? note.trim() : null
    if (nextNote !== item.note) patch.note = nextNote

    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    setSubmitting(true)
    try {
      await onSave(item.id, patch)
      // M15 — write-through to household_category_overrides so this pick
      // sticks for future adds of the same item. A DB trigger propagates
      // (name, category) into the global cache. Best-effort: failure is
      // logged but doesn't block the save.
      if (categoryChanged) {
        const householdId = useHouseholdStore.getState().householdId
        if (householdId) {
          const writeName = trimmedName.length > 0 ? trimmedName : item.name
          // Apply locally first so the next add of the same name picks up
          // the override even if the realtime echo from the upsert below
          // hasn't arrived yet.
          useCategoryOverridesStore.getState().apply(normaliseName(writeName), category)
          const result = await upsertHouseholdOverride(householdId, writeName, category, userId)
          if (!result.ok) {
            console.warn('[EditItemSheet] override write failed', result.error)
          }
        }
      }
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
          <span className="text-text-secondary text-[12px] leading-snug">
            Your pick is remembered for this name across the household.
          </span>
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

        <div className="border-border-default flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <Repeat
              size={18}
              strokeWidth={1.5}
              className="text-text-secondary mt-0.5 shrink-0"
              aria-hidden
            />
            <div className="flex flex-col">
              <span
                id={stapleLabelId}
                className="text-text-primary text-[16px] leading-relaxed font-medium"
              >
                Mark as staple
              </span>
              <span id={stapleDescId} className="text-text-secondary text-[13px] leading-snug">
                Stays on the list when you finish shopping.
              </span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isRecurring}
            aria-labelledby={stapleLabelId}
            aria-describedby={stapleDescId}
            onClick={() => {
              const next = !isRecurring
              setIsRecurring(next)
              if (next && !item.is_recurring && onStapleHint) onStapleHint()
            }}
            className="focus-visible:outline-accent flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="sr-only">{isRecurring ? 'Unmark staple' : 'Mark as staple'}</span>
            <span
              aria-hidden
              className={`relative inline-block h-[28px] w-[48px] rounded-full transition-colors duration-150 ${
                isRecurring ? 'bg-accent' : 'bg-border-default'
              }`}
            >
              <span
                className={`absolute top-1/2 left-[3px] block size-[22px] -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out ${
                  isRecurring ? 'translate-x-[20px]' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
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

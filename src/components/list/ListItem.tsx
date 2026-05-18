'use client'

import { Check, Trash2 } from 'lucide-react'
import { useRef, useState, type PointerEvent } from 'react'

import { formatQuantity, isUnitKey } from '@/lib/units'
import { useListStore, type ListItem as ListItemType } from '@/store/listStore'

function deriveQuantityDisplay(item: ListItemType): string | null {
  if (item.quantity_value != null && isUnitKey(item.quantity_unit)) {
    return formatQuantity(item.quantity_value, item.quantity_unit)
  }
  // Legacy fallback — pre-M8 items stored quantity as free text on `quantity`.
  // Render as-is so old data keeps showing the value the user typed.
  const legacy = item.quantity?.trim()
  return legacy ? legacy : null
}

interface ListItemProps {
  item: ListItemType
  onToggle: (id: string) => void
  onEdit: (item: ListItemType) => void
  onDelete: (id: string) => void
}

const SWIPE_THRESHOLD_PX = 96
const MAX_DRAG_PX = 160

export function ListItem({ item, onToggle, onEdit, onDelete }: ListItemProps) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef<number | null>(null)
  const pointerId = useRef<number | null>(null)
  const moved = useRef(false)
  const isFresh = useListStore((s) => s.freshlySyncedIds.has(item.id))
  const quantityDisplay = deriveQuantityDisplay(item)
  const ariaLabelName = quantityDisplay ? `${item.name}, ${quantityDisplay}` : item.name

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startX.current = e.clientX
    pointerId.current = e.pointerId
    moved.current = false
    setIsDragging(true)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (startX.current === null || pointerId.current !== e.pointerId) return
    const delta = e.clientX - startX.current
    if (Math.abs(delta) > 6) moved.current = true
    // Only allow left-swipe; clamp.
    const next = Math.min(0, Math.max(delta, -MAX_DRAG_PX))
    setDragX(next)
    if (Math.abs(delta) > 6) {
      // Capture so subsequent moves still come to us if finger drifts.
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    }
  }

  function onPointerEnd() {
    const committed = dragX <= -SWIPE_THRESHOLD_PX
    setDragX(0)
    setIsDragging(false)
    startX.current = null
    pointerId.current = null
    if (committed) {
      onDelete(item.id)
    }
  }

  function handleBodyClick() {
    // Swallow click that follows a drag — prevents accidentally opening the
    // edit sheet right after a swipe that didn't quite cross the threshold.
    if (moved.current) {
      moved.current = false
      return
    }
    onEdit(item)
  }

  return (
    <li className="relative overflow-hidden" style={{ touchAction: isDragging ? 'pan-y' : 'auto' }}>
      {/* Destructive zone revealed behind the row as it slides left. */}
      <div
        aria-hidden
        className="bg-destructive absolute inset-y-0 right-0 flex items-center gap-2 pr-5 pl-4 text-white"
        style={{ width: Math.abs(dragX) }}
      >
        <Trash2 size={20} strokeWidth={1.5} />
        <span className="text-[13px] font-medium">Delete</span>
      </div>

      <div
        className="bg-bg-surface flex items-stretch select-none"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={item.is_checked}
          aria-label={`${item.is_checked ? 'Uncheck' : 'Check'} ${ariaLabelName}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(item.id)
          }}
          className="flex h-12 w-12 shrink-0 items-center justify-center"
        >
          <span
            className={`ease-out-expo flex h-6 w-6 items-center justify-center rounded-md border transition-colors duration-[250ms] ${
              item.is_checked
                ? 'bg-accent border-accent text-white'
                : 'border-border-default bg-transparent'
            }`}
          >
            {item.is_checked ? <Check size={16} strokeWidth={2.5} aria-hidden /> : null}
          </span>
        </button>

        <button
          type="button"
          onClick={handleBodyClick}
          aria-label={`Edit ${ariaLabelName}`}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 py-2 pr-4 text-left"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={`text-text-primary ease-out-expo text-[16px] leading-relaxed break-words transition-opacity duration-[250ms] ${
                item.is_checked ? 'text-text-secondary line-through opacity-70' : ''
              }`}
            >
              {item.name}
              {quantityDisplay ? (
                <span className="text-text-secondary"> · {quantityDisplay}</span>
              ) : null}
            </span>
            {item.note ? (
              <span className="text-text-secondary line-clamp-1 text-[14px] leading-relaxed">
                {item.note}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {/* Realtime INSERT flash overlay. Placed after the body div so it sits
          above the body's white background — the body has transform:translateX
          which creates a stacking context, so a ::before pseudo on the <li>
          would render underneath. */}
      {isFresh ? (
        <div
          aria-hidden
          className="bg-accent flash-left-border pointer-events-none absolute inset-y-0 left-0 z-10 w-[3px]"
        />
      ) : null}
    </li>
  )
}

export default ListItem

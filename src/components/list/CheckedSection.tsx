'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { ListItem } from '@/components/list/ListItem'
import type { ListItem as ListItemType } from '@/store/listStore'

interface CheckedSectionProps {
  items: ListItemType[]
  onToggle: (id: string) => void
  onEdit: (item: ListItemType) => void
  onDelete: (id: string) => void
  onFinishShopping: () => void
}

export function CheckedSection({
  items,
  onToggle,
  onEdit,
  onDelete,
  onFinishShopping,
}: CheckedSectionProps) {
  const [collapsed, setCollapsed] = useState(true)
  if (items.length === 0) return null

  return (
    <section className="border-border-default/60 border-b">
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          className="flex min-h-[44px] flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className={`text-text-secondary ease-out-expo transition-transform duration-[250ms] ${
              collapsed ? '-rotate-90' : ''
            }`}
          />
          <span className="text-text-secondary text-[17px] leading-normal font-semibold">
            Checked
          </span>
          <span className="text-text-secondary text-[13px] font-medium tabular-nums">
            {items.length}
          </span>
        </button>
        <button
          type="button"
          onClick={onFinishShopping}
          className="text-accent min-h-[44px] px-2 text-[13px] font-semibold tracking-wide uppercase"
        >
          Finish
        </button>
      </div>
      {!collapsed ? (
        <ul className="divide-border-default/60 divide-y">
          {items.map((item) => (
            <ListItem
              key={item.id}
              item={item}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default CheckedSection

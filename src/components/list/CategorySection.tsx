'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { ListItem } from '@/components/list/ListItem'
import type { ListItem as ListItemType } from '@/store/listStore'

interface CategorySectionProps {
  category: string
  items: ListItemType[]
  onToggle: (id: string) => void
  onEdit: (item: ListItemType) => void
  onDelete: (id: string) => void
}

export function CategorySection({
  category,
  items,
  onToggle,
  onEdit,
  onDelete,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  if (items.length === 0) return null

  return (
    <section className="border-border-default/60 border-b">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="flex min-h-[44px] w-full items-center justify-between px-4 py-2"
      >
        <span className="text-text-primary text-[17px] leading-normal font-semibold">
          {category}
        </span>
        <span className="text-text-secondary flex items-center gap-2 text-[13px] font-medium">
          <span className="tabular-nums">{items.length}</span>
          <ChevronDown
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className={`ease-out-expo transition-transform duration-[250ms] ${
              collapsed ? '-rotate-90' : ''
            }`}
          />
        </span>
      </button>
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

export default CategorySection

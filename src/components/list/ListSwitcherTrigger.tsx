'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { ListSwitcherSheet } from '@/components/list/ListSwitcherSheet'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { useActiveList } from '@/hooks/useActiveList'
import { useHousehold } from '@/hooks/useHousehold'

// Tappable header title. Shows household name on the first line and the
// active list name on the second; the chevron signals there's more behind it.
// Falls back gracefully when there's only one list — the trigger still opens
// the sheet so the user can rename or create another.
export function ListSwitcherTrigger() {
  const { name: householdName } = useHousehold()
  const { activeList } = useActiveList()
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="text-text-primary -ml-2 flex min-h-[44px] max-w-[60vw] items-center gap-1.5 rounded-lg px-2 text-left hover:bg-[#EEEDE8] dark:hover:bg-[#2E2E30]"
      >
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-text-secondary truncate text-[12px] leading-snug">
            {householdName ?? 'Your household'}
          </span>
          <span className="font-display truncate text-[17px] leading-snug font-semibold">
            {activeList?.name ?? 'Lists'}
          </span>
        </span>
        <ChevronDown size={18} strokeWidth={1.5} aria-hidden className="text-text-secondary" />
      </button>
      {open ? (
        <ListSwitcherSheet
          open
          onClose={() => setOpen(false)}
          onError={(message) => setToast({ message })}
        />
      ) : null}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  )
}

export default ListSwitcherTrigger

'use client'

import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { RemindersEmpty, type ExamplePreset } from '@/components/plan/RemindersEmpty'
import { ReminderEditSheet, type ReminderSeed } from '@/components/plan/ReminderEditSheet'
import { RemindersList } from '@/components/plan/RemindersList'
import { Button } from '@/components/ui/Button'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { useHouseholdStore } from '@/store/householdStore'
import { useReminderStore, type Reminder } from '@/store/reminderStore'

export interface PlanRemindersViewProps {
  focusId: string | null
}

function seedFromExample(ex: ExamplePreset): ReminderSeed {
  return {
    title: ex.title,
    preset: ex.preset,
    hour: ex.hour,
    minute: ex.minute,
    leadMinutes: ex.leadMinutes,
  }
}

export function PlanRemindersView({ focusId }: PlanRemindersViewProps) {
  const members = useHouseholdStore((s) => s.members)
  const reminders = useReminderStore((s) => s.items)
  const isLoaded = useReminderStore((s) => s.isLoaded)

  const [editing, setEditing] = useState<Reminder | null>(null)
  const [seed, setSeed] = useState<ReminderSeed | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)
  const handledFocusRef = useRef<string | null>(null)

  // Deep-link: SW notificationclick lands here with ?focus=<reminder_id>.
  // Open the edit sheet for that reminder as soon as it's loaded. We track
  // the last handled id so a re-render after the user closes the sheet
  // doesn't keep re-opening it.
  useEffect(() => {
    if (!focusId || !isLoaded) return
    if (handledFocusRef.current === focusId) return
    const target = reminders.find((r) => r.id === focusId)
    if (target) {
      handledFocusRef.current = focusId
      // External signal (URL ?focus) → React state; the eslint rule's intent
      // (cascading renders) doesn't apply here — this runs at most once per
      // distinct focusId per session.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditing(target)
      setSeed(null)
      setSheetOpen(true)
    }
  }, [focusId, isLoaded, reminders])

  function openCreate(example?: ExamplePreset) {
    setEditing(null)
    setSeed(example ? seedFromExample(example) : null)
    setSheetOpen(true)
  }

  function openExisting(r: Reminder) {
    setEditing(r)
    setSeed(null)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    // Defer wiping state so the sheet's exit animation has data to render.
    setTimeout(() => {
      setEditing(null)
      setSeed(null)
    }, 350)
  }

  const showEmpty = isLoaded && reminders.filter((r) => r.is_active).length === 0

  return (
    <div className="relative flex h-full flex-col">
      {showEmpty ? (
        <RemindersEmpty onCreate={openCreate} />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
          {!isLoaded ? (
            <p className="text-text-secondary py-6 text-center text-[14px] leading-relaxed">
              Loading…
            </p>
          ) : (
            <RemindersList reminders={reminders} members={members} onOpen={openExisting} />
          )}
        </div>
      )}

      {!showEmpty ? (
        <div
          className="pointer-events-none absolute right-4 bottom-4 left-4 flex justify-end"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Button
            onClick={() => openCreate()}
            aria-label="New reminder"
            className="pointer-events-auto flex h-12 items-center gap-2 rounded-full px-5 shadow-lg"
          >
            <Plus size={18} strokeWidth={1.5} aria-hidden />
            New
          </Button>
        </div>
      ) : null}

      <ReminderEditSheet
        key={editing ? `edit:${editing.id}` : seed ? `seed:${seed.title}` : 'create'}
        open={sheetOpen}
        onClose={closeSheet}
        reminder={editing}
        seed={seed}
        onToast={(message) => setToast({ message })}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

export default PlanRemindersView

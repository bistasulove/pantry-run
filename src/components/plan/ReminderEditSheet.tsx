'use client'

import { Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AssigneePicker } from '@/components/plan/AssigneePicker'
import { formatPreviewFire } from '@/components/plan/format'
import { LeadMinutesPicker } from '@/components/plan/LeadMinutesPicker'
import { RecurrencePresetPicker } from '@/components/plan/RecurrencePresetPicker'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import {
  computeFirstFire,
  computeNextFires,
  decodeRrule,
  encodeRrule,
  type RecurrencePreset,
} from '@/lib/recurrence'
import { REMINDER_NOTES_MAX, REMINDER_TITLE_MAX, useReminders } from '@/hooks/useReminders'
import { useHouseholdStore } from '@/store/householdStore'
import type { Reminder } from '@/store/reminderStore'

export interface ReminderSeed {
  title: string
  preset: RecurrencePreset
  hour: number
  minute: number
  leadMinutes: number
}

interface ReminderEditSheetProps {
  open: boolean
  onClose: () => void
  // null = create mode (uses `seed` if provided, else a default empty draft).
  reminder: Reminder | null
  seed?: ReminderSeed | null
  onToast: (message: string) => void
}

interface DraftState {
  title: string
  notes: string
  preset: RecurrencePreset
  hour: number
  minute: number
  // For 'once': explicit date (ISO YYYY-MM-DD in device tz, parsed back to
  // local parts in the household tz when saving).
  onceDate: string
  leadMinutes: number
  assigneeId: string | null
}

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoTime(d: Date): { hour: number; minute: number } {
  return { hour: d.getHours(), minute: d.getMinutes() }
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyDraft(seed?: ReminderSeed | null): DraftState {
  if (seed) {
    return {
      title: seed.title,
      notes: '',
      preset: seed.preset,
      hour: seed.hour,
      minute: seed.minute,
      onceDate: todayIsoDate(),
      leadMinutes: seed.leadMinutes,
      assigneeId: null,
    }
  }
  return {
    title: '',
    notes: '',
    preset: { kind: 'weekly', days: ['TH'] },
    hour: 19,
    minute: 0,
    onceDate: todayIsoDate(),
    leadMinutes: 0,
    assigneeId: null,
  }
}

function draftFromReminder(r: Reminder): DraftState {
  const nextAt = new Date(r.next_fire_at)
  const { hour, minute } = isoTime(nextAt)
  const preset = decodeRrule(r.recurrence)
  return {
    title: r.title,
    notes: r.notes ?? '',
    preset,
    hour,
    minute,
    onceDate: toIsoDate(nextAt),
    leadMinutes: r.lead_minutes,
    assigneeId: r.assignee_id,
  }
}

function buildFirstFire(draft: DraftState, tz: string): Date {
  if (draft.preset.kind === 'once') {
    const [y, m, d] = draft.onceDate.split('-').map(Number)
    return localPartsToInstant(y, m, d, draft.hour, draft.minute, tz)
  }
  return computeFirstFire(draft.preset, draft.hour, draft.minute, tz)
}

// Mini helper — avoids exporting localPartsToUtc from recurrence.ts just for
// the one-shot branch.
function localPartsToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  let candidate = guess
  for (let i = 0; i < 3; i++) {
    const parts = new Map<string, string>()
    for (const p of fmt.formatToParts(new Date(candidate))) parts.set(p.type, p.value)
    const ly = Number(parts.get('year'))
    const lm = Number(parts.get('month'))
    const ld = Number(parts.get('day'))
    const lh = Number(parts.get('hour') === '24' ? '0' : parts.get('hour'))
    const lmin = Number(parts.get('minute'))
    const localUtc = Date.UTC(ly, lm - 1, ld, lh, lmin)
    const drift = guess - localUtc
    if (drift === 0) break
    candidate += drift
  }
  return new Date(candidate)
}

export function ReminderEditSheet({
  open,
  onClose,
  reminder,
  seed,
  onToast,
}: ReminderEditSheetProps) {
  const tz = useHouseholdStore((s) => s.timezone) ?? 'Australia/Sydney'
  const members = useHouseholdStore((s) => s.members)
  const { createReminder, updateReminder, deleteReminder, isPending } = useReminders()

  // Lazy init runs once per mount. The caller resets this component via a
  // `key` prop (id-or-mode) when the editor opens for a different target —
  // no useEffect-driven re-seed needed.
  const [draft, setDraft] = useState<DraftState>(() =>
    reminder ? draftFromReminder(reminder) : emptyDraft(seed),
  )
  const [error, setError] = useState<string | null>(null)

  const rrule = useMemo(() => encodeRrule(draft.preset), [draft.preset])
  const firstFire = useMemo(() => buildFirstFire(draft, tz), [draft, tz])
  const previewFires = useMemo(() => {
    if (draft.preset.kind === 'once') return [firstFire]
    return computeNextFires(rrule, firstFire, tz, 3)
  }, [rrule, firstFire, tz, draft.preset.kind])

  async function handleSave() {
    setError(null)
    if (reminder) {
      const result = await updateReminder(
        reminder.id,
        {
          title: draft.title,
          notes: draft.notes,
          recurrence: rrule,
          nextFireAt: firstFire,
          leadMinutes: draft.leadMinutes,
          assigneeId: draft.assigneeId,
          isActive: true,
        },
        tz,
      )
      if (!result.ok) {
        setError(result.error)
        return
      }
      onToast('Reminder saved')
    } else {
      const result = await createReminder({
        title: draft.title,
        notes: draft.notes,
        recurrence: rrule,
        firstFireAt: firstFire,
        leadMinutes: draft.leadMinutes,
        assigneeId: draft.assigneeId,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onToast('Reminder created')
    }
    onClose()
  }

  async function handleDelete() {
    if (!reminder) return
    const result = await deleteReminder(reminder.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onToast('Reminder deleted')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={reminder ? 'Edit reminder' : 'New reminder'}>
      <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary text-[13px] leading-snug font-medium">Title</span>
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            maxLength={REMINDER_TITLE_MAX}
            placeholder="Bin night"
            autoFocus
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-text-secondary text-[13px] leading-snug font-medium">Repeats</span>
          <RecurrencePresetPicker
            value={draft.preset}
            onChange={(preset) => setDraft({ ...draft, preset })}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {draft.preset.kind === 'once' ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-text-secondary text-[13px] leading-snug font-medium">Date</span>
              <input
                type="date"
                value={draft.onceDate}
                onChange={(e) => setDraft({ ...draft, onceDate: e.target.value })}
                className="border-border-default bg-bg-surface text-text-primary h-11 rounded-xl border px-3 text-[16px] leading-relaxed"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="text-text-secondary text-[13px] leading-snug font-medium">Time</span>
            <input
              type="time"
              value={`${String(draft.hour).padStart(2, '0')}:${String(draft.minute).padStart(2, '0')}`}
              onChange={(e) => {
                const [hStr, mStr] = e.target.value.split(':')
                setDraft({
                  ...draft,
                  hour: Number(hStr) || 0,
                  minute: Number(mStr) || 0,
                })
              }}
              className="border-border-default bg-bg-surface text-text-primary h-11 rounded-xl border px-3 text-[16px] leading-relaxed"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-text-secondary text-[13px] leading-snug font-medium">Notify</span>
          <LeadMinutesPicker
            value={draft.leadMinutes}
            onChange={(leadMinutes) => setDraft({ ...draft, leadMinutes })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-text-secondary text-[13px] leading-snug font-medium">
            Assigned to
          </span>
          <AssigneePicker
            value={draft.assigneeId}
            members={members}
            onChange={(assigneeId) => setDraft({ ...draft, assigneeId })}
          />
          <span className="text-text-secondary text-[12px] leading-snug">
            Whole household sends a push to everyone with notifications enabled.
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-text-secondary text-[13px] leading-snug font-medium">
            Notes (optional)
          </span>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            maxLength={REMINDER_NOTES_MAX}
            rows={2}
            placeholder="Anything to remember"
            className="border-border-default bg-bg-surface text-text-primary resize-none rounded-xl border px-3 py-2 text-[16px] leading-relaxed"
          />
        </label>

        <div className="bg-bg-base rounded-xl px-3 py-3">
          <p className="text-text-secondary mb-2 text-[12px] leading-snug font-medium tracking-wide uppercase">
            Next {previewFires.length} fire{previewFires.length === 1 ? '' : 's'}
          </p>
          <ul className="flex flex-col gap-1 text-[14px] leading-relaxed">
            {previewFires.map((d, i) => (
              <li key={i} className="text-text-primary">
                {formatPreviewFire(d)}
              </li>
            ))}
          </ul>
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-[14px] leading-relaxed">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleSave} disabled={isPending} fullWidth>
            {reminder ? 'Save changes' : 'Create reminder'}
          </Button>
          {reminder ? (
            <Button onClick={handleDelete} variant="ghost" disabled={isPending} fullWidth>
              <Trash2 size={16} strokeWidth={1.5} aria-hidden className="mr-1.5" />
              Delete reminder
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  )
}

export default ReminderEditSheet

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

import { PlanRemindersView } from '@/components/plan/PlanRemindersView'
import { PlanTasksView } from '@/components/plan/PlanTasksView'
import { SegmentedControl } from '@/components/plan/SegmentedControl'

// V2 Plan tab shell. The segmented control's value is mirrored in the URL
// (?tab=reminders|tasks) so:
//   - the SW notificationclick deep-link (M16/M17/M18) lands on the right
//     view via /plan?tab=reminders&focus=<id> or /plan?tab=tasks&focus=<id>
//   - the back button restores the user's last view choice
// The ?focus query is forwarded to whichever sub-view is active; each view
// opens its edit sheet for that id (PlanRemindersView for reminders,
// PlanTasksView for tasks).

type PlanTab = 'reminders' | 'tasks'

const OPTIONS = [
  { value: 'reminders' as const, label: 'Reminders' },
  { value: 'tasks' as const, label: 'Tasks' },
]

function parseTab(raw: string | null): PlanTab {
  return raw === 'tasks' ? 'tasks' : 'reminders'
}

export function PlanView() {
  const router = useRouter()
  const search = useSearchParams()
  const tab = parseTab(search.get('tab'))
  const focusId = useMemo(() => search.get('focus'), [search])

  const setTab = useCallback(
    (next: PlanTab) => {
      const params = new URLSearchParams(search.toString())
      if (next === 'reminders') {
        params.delete('tab')
      } else {
        params.set('tab', next)
      }
      // Drop ?focus on tab change — it's view-specific and a focused id from
      // the previous view won't match anything in the next view's store.
      params.delete('focus')
      const query = params.toString()
      router.replace(query ? `/plan?${query}` : '/plan', { scroll: false })
    },
    [router, search],
  )

  return (
    <div className="flex h-full flex-col">
      <SegmentedControl options={OPTIONS} value={tab} onChange={setTab} ariaLabel="Plan view" />
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'reminders' ? (
          <PlanRemindersView focusId={focusId} />
        ) : (
          <PlanTasksView focusId={focusId} />
        )}
      </div>
    </div>
  )
}

export default PlanView

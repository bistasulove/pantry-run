import { Suspense } from 'react'

import { PlanView } from '@/app/(app)/plan/PlanView'

// /plan — V2 home for Reminders (M17) + Tasks (M18). Pure client view: the
// reminders cache is hydrated by RemindersRealtime mounted in AppShell, so
// no server fetch is needed here. Suspense boundary is required because
// PlanView reads useSearchParams.
export default function PlanPage() {
  return (
    <Suspense fallback={null}>
      <PlanView />
    </Suspense>
  )
}

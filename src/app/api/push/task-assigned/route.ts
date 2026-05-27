// M18 — POST /api/push/task-assigned
//
// Called by the client (useTasks or the offline queue executor) immediately
// after a successful task create/reassign with a non-null assignee. Verifies
// the caller is a member of the task's household, then fans out a single
// push to the assignee via sendToUser. Reuses the M16 send helper so the
// payload shape and SW route mapping are identical to reminders.
//
// Body: { task_id: string }
// Returns 200 with { sent, expired, failed } (per M16's "surface the payload,
// not just status" lesson). Returns 4xx for invalid input / unauthorized /
// not-a-member / assignee-cleared. A 200 with sent=0 means the assignee has
// no registered devices — that's a real outcome, not an error.

import { NextResponse } from 'next/server'

import { sendToUser } from '@/lib/push/send'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { task_id?: unknown }

type TaskRow = {
  id: string
  household_id: string
  title: string
  notes: string | null
  assignee_id: string | null
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const taskId = typeof body.task_id === 'string' ? body.task_id : null
  if (!taskId) {
    return NextResponse.json({ error: 'invalid_task_id' }, { status: 400 })
  }

  // Verify the caller is signed in. The membership check below uses RLS via
  // the user's JWT — only members of the task's household can read the row.
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Read the task through the user's RLS session. If the user isn't a member
  // of the task's household this returns null (RLS hides the row), which we
  // treat as 404. We deliberately don't probe for the row separately — RLS
  // is the membership check.
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, household_id, title, notes, assignee_id')
    .eq('id', taskId)
    .maybeSingle<TaskRow>()
  if (taskError) {
    return NextResponse.json(
      { error: 'task_lookup_failed', detail: taskError.message },
      { status: 500 },
    )
  }
  if (!task) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (!task.assignee_id) {
    // Caller raced a clear-assignee or we got here with an unassigned task.
    // Nothing to send — not an error, but worth distinguishing from a real send.
    return NextResponse.json({ ok: true, sent: 0, expired: 0, failed: 0, skipped: true })
  }

  // Resolve the actor's display name from the household_members snapshot for
  // the body line ("<actor> assigned: <title>"). Service-role here because
  // the caller's RLS view of household_members may be limited to their own
  // row in some configurations — we want a guaranteed read of the actor's
  // own snapshot.
  const admin = createAdminClient()
  const { data: actorMembership } = await admin
    .from('household_members')
    .select('display_name')
    .eq('user_id', user.id)
    .eq('household_id', task.household_id)
    .maybeSingle()
  const actorName = actorMembership?.display_name?.trim() || 'Someone'

  const body_line = `${actorName} assigned: ${task.title}`
  const summary = await sendToUser(task.assignee_id, {
    title: task.title,
    body: body_line,
    kind: 'task',
    target_id: task.id,
    household_id: task.household_id,
  })

  return NextResponse.json({ ok: true, ...summary })
}

// M17 — Cron callback hit by Postgres pg_net once per minute.
//
// fire_due_reminders() inserts reminder_fires rows with status='pending', then
// POSTs the new fire ids here. This route:
//   1. Validates the bearer token against CRON_SECRET (matches the value in
//      public.app_settings.cron_secret).
//   2. Reads back the rows (join reminders → title / household_id / assignee).
//   3. Fans out push via sendToUser (assigned) or sendToHousehold (whole
//      household).
//   4. Writes back delivery_status + delivery_detail on each fire row.
//
// Node runtime is required by web-push (uses node:crypto). Service-role
// client because the route operates across users.

import { NextResponse } from 'next/server'

import { sendToHousehold, sendToUser, type SendSummary } from '@/lib/push/send'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type FireRow = {
  id: string
  reminder_id: string
  household_id: string
  reminder: {
    title: string
    notes: string | null
    assignee_id: string | null
  } | null
}

function statusFromSummary(summary: SendSummary): 'sent' | 'no_subscriptions' | 'failed' {
  if (summary.sent > 0) return 'sent'
  if (summary.failed > 0) return 'failed'
  return 'no_subscriptions'
}

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { fire_ids?: unknown }
  try {
    body = (await request.json()) as { fire_ids?: unknown }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const fireIds = Array.isArray(body.fire_ids)
    ? body.fire_ids.filter((id): id is string => typeof id === 'string')
    : []
  if (fireIds.length === 0) {
    return NextResponse.json({ ok: true, fired: 0 })
  }

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from('reminder_fires')
    .select('id, reminder_id, household_id, reminder:reminders(title, notes, assignee_id)')
    .in('id', fireIds)
    .eq('delivery_status', 'pending')
    .returns<FireRow[]>()

  if (error) {
    return NextResponse.json({ error: 'read_failed', detail: error.message }, { status: 500 })
  }

  let firedCount = 0
  for (const row of rows ?? []) {
    if (!row.reminder) {
      // Reminder was deleted between fire and delivery — mark and move on.
      await admin
        .from('reminder_fires')
        .update({ delivery_status: 'failed', delivery_detail: 'reminder_missing' })
        .eq('id', row.id)
      continue
    }

    const payload = {
      title: row.reminder.title,
      body: row.reminder.notes ?? undefined,
      kind: 'reminder' as const,
      target_id: row.reminder_id,
      household_id: row.household_id,
    }

    let summary: SendSummary
    try {
      summary = row.reminder.assignee_id
        ? await sendToUser(row.reminder.assignee_id, payload)
        : await sendToHousehold(row.household_id, payload)
    } catch (e) {
      await admin
        .from('reminder_fires')
        .update({
          delivery_status: 'failed',
          delivery_detail: (e as Error).message?.slice(0, 200) ?? 'send_threw',
        })
        .eq('id', row.id)
      continue
    }

    const status = statusFromSummary(summary)
    await admin
      .from('reminder_fires')
      .update({
        delivery_status: status,
        delivery_detail: `sent=${summary.sent} expired=${summary.expired} failed=${summary.failed}`,
      })
      .eq('id', row.id)
    if (status === 'sent') firedCount++
  }

  return NextResponse.json({ ok: true, fired: firedCount, processed: rows?.length ?? 0 })
}

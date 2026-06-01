import 'server-only'

import * as Sentry from '@sentry/nextjs'
import webpush, { type PushSubscription as WebPushSubscription } from 'web-push'

import { createAdminClient } from '@/lib/supabase/admin'

// Server-side push delivery. Wraps the `web-push` library so callers don't
// have to think about VAPID setup, payload encryption, or expired-subscription
// cleanup. Two public entrypoints:
//
//   sendToUser(userId, payload)
//     — fan-out to all devices registered by a single user.
//
//   sendToHousehold(householdId, payload, { excludeUserId? })
//     — fan-out across every member of a household. M17 reminder cron and
//       M18 task-assignment will call this. excludeUserId is the standard
//       "don't notify the person who triggered the event" shortcut.
//
// Expired-subscription cleanup is inline (per M16 kickoff decision): when
// the push service returns 404 or 410, the subscription is gone for good.
// We delete the row and move on. Any other error gets a Sentry capture and
// a counted failure, but doesn't throw — one bad device shouldn't sink the
// whole fan-out.

export type PushKind = 'reminder' | 'task'

export type PushPayload = {
  title: string
  body?: string
  kind?: PushKind
  // Per the SW contract (public/sw.js): payload uses snake_case so the same
  // string travels client → service worker without remapping.
  target_id?: string
  household_id?: string
}

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      'Missing VAPID env vars. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.',
    )
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

type SubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

type DeliveryResult =
  | { ok: true; id: string }
  | { ok: false; id: string; statusCode: number | undefined; err: unknown }

async function deliverOne(row: SubscriptionRow, payload: PushPayload): Promise<DeliveryResult> {
  const subscription: WebPushSubscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return { ok: true, id: row.id }
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    return { ok: false, id: row.id, statusCode, err }
  }
}

async function cleanupExpired(ids: string[]) {
  if (ids.length === 0) return
  const admin = createAdminClient()
  const { error } = await admin.from('push_subscriptions').delete().in('id', ids)
  if (error) {
    Sentry.captureException(error, { tags: { feature: 'push', op: 'cleanup' } })
  }
}

export type SendSummary = { sent: number; expired: number; failed: number }

async function sendBatch(rows: SubscriptionRow[], payload: PushPayload): Promise<SendSummary> {
  if (rows.length === 0) return { sent: 0, expired: 0, failed: 0 }
  ensureVapid()
  const results = await Promise.all(rows.map((r) => deliverOne(r, payload)))
  const expired: string[] = []
  let sent = 0
  let failed = 0
  for (const res of results) {
    if (res.ok) {
      sent++
    } else if (res.statusCode === 404 || res.statusCode === 410) {
      expired.push(res.id)
    } else {
      failed++
      Sentry.captureException(res.err, {
        tags: {
          feature: 'push',
          op: 'send',
          statusCode: String(res.statusCode ?? 'unknown'),
        },
      })
    }
  }
  await cleanupExpired(expired)
  return { sent, expired: expired.length, failed }
}

export async function sendToUser(userId: string, payload: PushPayload): Promise<SendSummary> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (error) throw error
  return sendBatch(data ?? [], payload)
}

export async function sendToHousehold(
  householdId: string,
  payload: PushPayload,
  options: { excludeUserId?: string } = {},
): Promise<SendSummary> {
  const admin = createAdminClient()
  let query = admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('household_id', householdId)
  if (options.excludeUserId) {
    query = query.neq('user_id', options.excludeUserId)
  }
  const { data, error } = await query
  if (error) throw error
  return sendBatch(data ?? [], payload)
}

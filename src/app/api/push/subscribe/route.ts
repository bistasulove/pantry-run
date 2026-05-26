import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// POST /api/push/subscribe
//
// Body: { endpoint, p256dh, auth, userAgentLabel? }
//
// Upserts the row on (user_id, endpoint). Calling this with an existing
// endpoint refreshes household_id and user_agent_label, which is how the
// hook self-heals when the user switches households — it re-POSTs on app
// boot, the server overwrites household_id, fan-out targets the new home.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SubscribeBody = {
  endpoint?: unknown
  p256dh?: unknown
  auth?: unknown
  userAgentLabel?: unknown
}

function isNonEmptyString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

export async function POST(request: Request) {
  let body: SubscribeBody
  try {
    body = (await request.json()) as SubscribeBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (
    !isNonEmptyString(body.endpoint, 1024) ||
    !isNonEmptyString(body.p256dh, 256) ||
    !isNonEmptyString(body.auth, 64)
  ) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 })
  }
  const userAgentLabel =
    typeof body.userAgentLabel === 'string' && body.userAgentLabel.length > 0
      ? body.userAgentLabel.slice(0, 80)
      : null

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (membershipError) {
    return NextResponse.json({ error: 'membership_lookup_failed' }, { status: 500 })
  }
  if (!membership) {
    return NextResponse.json({ error: 'no_household' }, { status: 409 })
  }

  const { error: upsertError } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      household_id: membership.household_id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      user_agent_label: userAgentLabel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' },
  )
  if (upsertError) {
    return NextResponse.json(
      { error: 'upsert_failed', detail: upsertError.message },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}

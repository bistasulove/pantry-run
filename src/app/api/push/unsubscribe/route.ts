import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// POST /api/push/unsubscribe
//
// Body: { endpoint } OR { id }
//
// Removes a single subscription owned by the current user. Idempotent — a
// row that no longer exists returns ok. Two body shapes:
//   - { endpoint } — used by the hook when the browser-side unsubscribe
//     succeeds. The endpoint is what the browser knows.
//   - { id } — used by the Settings "Remove device" button when removing
//     a sibling device the current browser doesn't own the subscription
//     object for.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UnsubscribeBody = { endpoint?: unknown; id?: unknown }

export async function POST(request: Request) {
  let body: UnsubscribeBody
  try {
    body = (await request.json()) as UnsubscribeBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null
  const id = typeof body.id === 'string' ? body.id : null
  if (!endpoint && !id) {
    return NextResponse.json({ error: 'missing_target' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let query = supabase.from('push_subscriptions').delete().eq('user_id', user.id)
  if (id) {
    query = query.eq('id', id)
  } else if (endpoint) {
    query = query.eq('endpoint', endpoint)
  }
  const { error: deleteError } = await query
  if (deleteError) {
    return NextResponse.json(
      { error: 'delete_failed', detail: deleteError.message },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}

// Dev seam — POST /api/push/test sends a sample notification to the current
// user's registered devices. Used by the Settings "Send test notification"
// button to verify a fresh subscription is wired correctly end-to-end.
//
// Removed at M20 close-out per the M13/M14 seam-and-remove pattern. Until
// then, the route 404s in production via NODE_ENV check below.

import { NextResponse } from 'next/server'

import { sendToUser } from '@/lib/push/send'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const summary = await sendToUser(user.id, {
    title: 'Pantry Run',
    body: 'Test notification — push is working.',
    kind: 'test',
  })
  return NextResponse.json({ ok: true, ...summary })
}

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { error, status } = await supabase.from('households').select('id').limit(1)

    if (error) {
      return NextResponse.json(
        { ok: false, supabase: { status, error: error.message } },
        { status: 503 },
      )
    }

    return NextResponse.json({ ok: true, supabase: { status } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

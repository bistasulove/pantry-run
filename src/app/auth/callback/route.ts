import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// Handles every Supabase auth redirect that returns a one-time `code`:
//   - Google OAuth completion
//   - Email confirmation after updateUser({ email })
//   - Password recovery (resetPasswordForEmail) — caller sets ?next=/reset-password/new
//
// The route handler exchanges the code for a session (which sets the auth
// cookies on the response automatically in Next.js 15 Route Handlers) and
// then redirects to the safe `next` path.

function safeNext(value: string | null): string {
  // Only allow same-origin paths to prevent an open-redirect via a crafted
  // ?next=https://evil.example query parameter.
  if (!value) return '/list'
  if (!value.startsWith('/') || value.startsWith('//')) return '/list'
  return value
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=callback_missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback] exchange failed', error)
    return NextResponse.redirect(`${origin}/sign-in?error=callback_failed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}

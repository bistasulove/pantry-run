import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// Shared logic for the auth callback route handlers: pull the PKCE `code`
// from the URL, exchange it for a session (which sets the auth cookies on
// the response — only possible in a route handler, not a server component),
// and redirect to `destination` on success or to /sign-in with an error
// code on failure. SignInForm renders friendly copy for those error codes.
export async function exchangeCodeAndRedirect(
  request: NextRequest,
  destination: string,
): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=callback_missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth] code exchange failed', error)
    return NextResponse.redirect(`${origin}/sign-in?error=callback_failed`)
  }

  return NextResponse.redirect(`${origin}${destination}`)
}

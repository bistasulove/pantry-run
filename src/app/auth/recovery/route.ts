import { type NextRequest } from 'next/server'

import { exchangeCodeAndRedirect } from '@/lib/supabase/exchange-code'

// Handles the password-recovery redirect after the user clicks the link in
// the reset email. Supabase verifies the link, redirects here with a
// one-time `code`; we exchange it for a (recovery) session and land the
// user on /reset-password/new to set a new password.
//
// Separate from /auth/callback purely so the redirect URL stays a plain
// path — Supabase's redirect allow-list doesn't reliably match dynamic
// query strings, so a single callback with ?next=/reset-password/new fell
// through to the Site URL and dumped the user on the homepage.
export async function GET(request: NextRequest) {
  return exchangeCodeAndRedirect(request, '/reset-password/new')
}

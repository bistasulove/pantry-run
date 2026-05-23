import { type NextRequest } from 'next/server'

import { exchangeCodeAndRedirect } from '@/lib/supabase/exchange-code'

// Handles the email-confirmation redirect after an anonymous user upgrades
// via updateUser({ email, password }). Supabase verifies the emailed link,
// then redirects here with a one-time `code`; we exchange it for a session
// and land the user on their list.
//
// Password recovery has its own route (/auth/recovery) so neither flow needs
// a query string on the redirect URL — Supabase's redirect allow-list does
// not reliably match dynamic query params.
export async function GET(request: NextRequest) {
  return exchangeCodeAndRedirect(request, '/list')
}

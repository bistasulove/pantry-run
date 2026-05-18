import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/database.types'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // We handle every Supabase code/token exchange explicitly in
      // src/app/auth/callback/route.ts — email confirmation, password recovery,
      // and (when V2 reintroduces it) Google OAuth all flow through PKCE codes
      // in the query string, never URL hash fragments. Leaving Supabase's auto
      // detection enabled would race with AuthErrorHashHandler: the client
      // consumes hash params on init (including error fragments like
      // #error=access_denied&error_code=otp_expired) and clears them before
      // we can read and surface a toast.
      detectSessionInUrl: false,
    },
  })
}

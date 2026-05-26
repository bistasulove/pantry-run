import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

// Service-role client — bypasses RLS. Use only on the server for operations
// that cross the per-user boundary (e.g. M16 push fan-out across all members
// of a household). Never import from a client component or route handler that
// runs in the Edge runtime; 'server-only' enforces the first at build time.

let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createAdminClient() {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase admin env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  cached = createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

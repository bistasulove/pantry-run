import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// Bounces signed-in users with a household away from onboarding routes.
// The proxy already redirects unauth users *into* /welcome; this is the inverse
// guard so the create/join flows aren't reachable once a household exists.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (membership) {
      redirect('/list')
    }
  }

  return <>{children}</>
}

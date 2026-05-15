import { redirect } from 'next/navigation'

import { HouseholdHydrator } from '@/components/providers/HouseholdHydrator'
import { createClient } from '@/lib/supabase/server'
import type { Member } from '@/store/householdStore'

// Server-side gate for the (app) routes. Without a household membership the
// user has nothing to render, so we route them back to /welcome. With a
// membership we hydrate the household store before children mount.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/welcome')
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    redirect('/welcome')
  }

  const [{ data: household }, { data: memberRows }] = await Promise.all([
    supabase.from('households').select('id, name').eq('id', membership.household_id).single(),
    supabase
      .from('household_members')
      .select('user_id, role, display_name, joined_at')
      .eq('household_id', membership.household_id)
      .order('joined_at', { ascending: true }),
  ])

  if (!household) {
    // Membership row points at a household that's gone (or RLS blocked us).
    // Treat as no household and re-onboard.
    redirect('/welcome')
  }

  const members: Member[] = (memberRows ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role === 'owner' ? 'owner' : 'member',
    displayName: m.display_name,
    joinedAt: m.joined_at,
  }))

  return (
    <HouseholdHydrator householdId={household.id} name={household.name} members={members}>
      {children}
    </HouseholdHydrator>
  )
}

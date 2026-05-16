import { redirect } from 'next/navigation'

import { HouseholdView } from '@/app/(app)/household/HouseholdView'
import { createClient } from '@/lib/supabase/server'

export default async function HouseholdPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/welcome')

  // The (app) layout has already gated membership. We re-fetch the household
  // here to pick up the invite_code (which we deliberately don't put in the
  // store so it isn't lying around in client memory longer than needed).
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!membership) redirect('/welcome')

  const [{ data: household }, { data: memberRows }] = await Promise.all([
    supabase
      .from('households')
      .select('id, name, invite_code, code_expires_at')
      .eq('id', membership.household_id)
      .single(),
    supabase
      .from('household_members')
      .select('user_id, role, display_name, joined_at')
      .eq('household_id', membership.household_id)
      .order('joined_at', { ascending: true }),
  ])
  if (!household) redirect('/welcome')

  const members = (memberRows ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role,
    displayName: m.display_name,
    joinedAt: m.joined_at,
  }))

  // Compute expiry on the server so SSR + first client render agree — avoids
  // the kind of hydration mismatch InviteCode hit with the share-API check.
  // Server Components render once per request; Date.now() here is request-time,
  // not re-evaluated client-side, so the react-hooks/purity rule's concern
  // about unstable re-renders doesn't apply.
  // eslint-disable-next-line react-hooks/purity
  const isExpired = new Date(household.code_expires_at).getTime() <= Date.now()

  return (
    <HouseholdView
      id={household.id}
      name={household.name}
      inviteCode={household.invite_code}
      codeExpiresAt={household.code_expires_at}
      isExpired={isExpired}
      currentUserId={user.id}
      members={members}
    />
  )
}

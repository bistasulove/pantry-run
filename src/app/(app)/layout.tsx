import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { AppShell } from '@/components/layout/AppShell'
import { HouseholdHydrator } from '@/components/providers/HouseholdHydrator'
import { ACTIVE_LIST_COOKIE } from '@/lib/active-list-cookie'
import { createClient } from '@/lib/supabase/server'
import type { ListSummary, Member } from '@/store/householdStore'

// Server-side gate for the (app) routes. Without a household membership the
// user has nothing to render, so we route them back to /welcome. With a
// membership we fetch members + all lists, pick the active list (cookie if
// valid, else oldest), and hydrate before children mount.
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

  const [{ data: household }, { data: memberRows }, { data: listRows }] = await Promise.all([
    supabase.from('households').select('id, name').eq('id', membership.household_id).single(),
    supabase
      .from('household_members')
      .select('user_id, role, display_name, joined_at')
      .eq('household_id', membership.household_id)
      .order('joined_at', { ascending: true }),
    supabase
      .from('lists')
      .select('id, name, created_at, created_by')
      .eq('household_id', membership.household_id)
      .order('created_at', { ascending: true }),
  ])

  if (!household || !listRows || listRows.length === 0) {
    // Membership points at a household that's gone, or the create_household
    // RPC failed to seed the default list (shouldn't happen). Re-onboard.
    redirect('/welcome')
  }

  const members: Member[] = (memberRows ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role === 'owner' ? 'owner' : 'member',
    displayName: m.display_name,
    joinedAt: m.joined_at,
  }))

  const lists: ListSummary[] = listRows.map((l) => ({
    id: l.id,
    name: l.name,
    createdAt: l.created_at,
    createdBy: l.created_by,
  }))

  const cookieStore = await cookies()
  const cookieListId = cookieStore.get(ACTIVE_LIST_COOKIE)?.value ?? null
  const activeListId =
    cookieListId && lists.some((l) => l.id === cookieListId) ? cookieListId : lists[0].id

  return (
    <HouseholdHydrator
      householdId={household.id}
      name={household.name}
      members={members}
      lists={lists}
      activeListId={activeListId}
      currentUserId={user.id}
    >
      <AppShell>{children}</AppShell>
    </HouseholdHydrator>
  )
}

import { SettingsView } from '@/app/(app)/settings/SettingsView'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/welcome')

  const { data: membership } = await supabase
    .from('household_members')
    .select('id, household_id, display_name')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!membership) redirect('/welcome')

  return (
    <SettingsView memberRowId={membership.id} initialDisplayName={membership.display_name ?? ''} />
  )
}

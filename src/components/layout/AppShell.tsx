import { SaveAccountBanner } from '@/components/auth/SaveAccountBanner'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { InstallBanner } from '@/components/layout/InstallBanner'
import { MissingNameBanner } from '@/components/layout/MissingNameBanner'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { HouseholdListsRealtime } from '@/components/providers/HouseholdListsRealtime'
import { HouseholdMembersRealtime } from '@/components/providers/HouseholdMembersRealtime'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="bg-bg-base text-text-primary flex h-dvh flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        overscrollBehaviorY: 'contain',
      }}
    >
      <Header />
      <MissingNameBanner />
      <OfflineBanner />
      <SaveAccountBanner />
      <InstallBanner />
      <HouseholdMembersRealtime />
      <HouseholdListsRealtime />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <BottomNav />
    </div>
  )
}

export default AppShell

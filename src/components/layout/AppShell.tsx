import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { MissingNameBanner } from '@/components/layout/MissingNameBanner'
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
      <HouseholdMembersRealtime />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <BottomNav />
    </div>
  )
}

export default AppShell

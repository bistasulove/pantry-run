'use client'

import { Bell, LogOut, Settings, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Sheet } from '@/components/ui/Sheet'
import { Toast, type ToastOptions } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'
import { useListStore } from '@/store/listStore'
import { useReminderStore } from '@/store/reminderStore'

// V2 nav refactor (plan.md §11.6.1). The BottomNav now has a single Avatar
// slot whose tap opens this sheet. Four entries:
//   Household       → /household
//   Settings        → /settings
//   Notifications   → /settings#notifications (anchor scroll into the existing
//                     NotificationsSection — saves shipping a new route for V2)
//   Sign out        → supabase.auth.signOut + store cleanup, then /welcome

interface AvatarMenuSheetProps {
  open: boolean
  onClose: () => void
}

export function AvatarMenuSheet({ open, onClose }: AvatarMenuSheetProps) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)

  function go(path: string) {
    onClose()
    router.push(path)
  }

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[AvatarMenuSheet] sign-out failed', error)
      setToast({ message: "Couldn't sign you out. Try again." })
      setSigningOut(false)
      return
    }
    // Wipe stores so nothing flashes during the redirect. SessionProvider's
    // auth listener clears userStore separately.
    useHouseholdStore.getState().clearHousehold()
    useListStore.getState().setItems([])
    useReminderStore.getState().clear()
    onClose()
    router.refresh()
    router.replace('/welcome')
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Menu">
        <ul className="flex flex-col gap-1">
          <li>
            <button
              type="button"
              onClick={() => go('/household')}
              className="text-text-primary hover:bg-bg-base flex h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-[16px] leading-relaxed transition-colors duration-150"
            >
              <Users size={20} strokeWidth={1.5} aria-hidden />
              Household
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => go('/settings')}
              className="text-text-primary hover:bg-bg-base flex h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-[16px] leading-relaxed transition-colors duration-150"
            >
              <Settings size={20} strokeWidth={1.5} aria-hidden />
              Settings
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => go('/settings#notifications')}
              className="text-text-primary hover:bg-bg-base flex h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-[16px] leading-relaxed transition-colors duration-150"
            >
              <Bell size={20} strokeWidth={1.5} aria-hidden />
              Notifications
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-destructive hover:bg-bg-base flex h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-[16px] leading-relaxed transition-colors duration-150 disabled:opacity-60"
            >
              <LogOut size={20} strokeWidth={1.5} aria-hidden />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </li>
        </ul>
      </Sheet>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  )
}

export default AvatarMenuSheet

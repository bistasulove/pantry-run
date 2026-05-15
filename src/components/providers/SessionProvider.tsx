'use client'

import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/userStore'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (session?.user) {
        useUserStore.getState().setUser({
          userId: session.user.id,
          isAnonymous: session.user.is_anonymous ?? false,
        })
        return
      }

      const { data, error } = await supabase.auth.signInAnonymously()

      if (cancelled) return

      if (error || !data.user) {
        console.error('[SessionProvider] anonymous sign-in failed', error)
        return
      }

      useUserStore.getState().setUser({
        userId: data.user.id,
        isAnonymous: data.user.is_anonymous ?? true,
      })
    }

    bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        useUserStore.getState().setUser({
          userId: session.user.id,
          isAnonymous: session.user.is_anonymous ?? false,
        })
      } else {
        useUserStore.getState().clearUser()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}

export default SessionProvider

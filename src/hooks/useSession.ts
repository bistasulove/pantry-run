'use client'

import { useUserStore } from '@/store/userStore'

export interface SessionState {
  userId: string | null
  isAnonymous: boolean
  displayName: string | null
  isAuthenticated: boolean
}

export function useSession(): SessionState {
  const userId = useUserStore((state) => state.userId)
  const isAnonymous = useUserStore((state) => state.isAnonymous)
  const displayName = useUserStore((state) => state.displayName)

  return {
    userId,
    isAnonymous,
    displayName,
    isAuthenticated: userId !== null,
  }
}

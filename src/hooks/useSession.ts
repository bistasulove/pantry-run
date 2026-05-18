'use client'

import { useUserStore } from '@/store/userStore'

export interface SessionState {
  userId: string | null
  isAnonymous: boolean
  displayName: string | null
  email: string | null
  pendingEmail: string | null
  provider: string | null
  createdAt: string | null
  isAuthenticated: boolean
}

export function useSession(): SessionState {
  const userId = useUserStore((state) => state.userId)
  const isAnonymous = useUserStore((state) => state.isAnonymous)
  const displayName = useUserStore((state) => state.displayName)
  const email = useUserStore((state) => state.email)
  const pendingEmail = useUserStore((state) => state.pendingEmail)
  const provider = useUserStore((state) => state.provider)
  const createdAt = useUserStore((state) => state.createdAt)

  return {
    userId,
    isAnonymous,
    displayName,
    email,
    pendingEmail,
    provider,
    createdAt,
    isAuthenticated: userId !== null,
  }
}

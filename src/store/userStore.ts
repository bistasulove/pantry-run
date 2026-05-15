import { create } from 'zustand'

interface UserStore {
  userId: string | null
  isAnonymous: boolean
  displayName: string | null
  setUser: (user: { userId: string; isAnonymous: boolean }) => void
  setDisplayName: (displayName: string | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  userId: null,
  isAnonymous: false,
  displayName: null,
  setUser: ({ userId, isAnonymous }) => set({ userId, isAnonymous }),
  setDisplayName: (displayName) => set({ displayName }),
  clearUser: () => set({ userId: null, isAnonymous: false, displayName: null }),
}))

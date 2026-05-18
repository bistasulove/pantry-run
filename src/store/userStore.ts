import { create } from 'zustand'

interface SetUserPayload {
  userId: string
  isAnonymous: boolean
  email: string | null
  pendingEmail: string | null
  provider: string | null
  createdAt: string | null
}

interface UserStore {
  userId: string | null
  isAnonymous: boolean
  displayName: string | null
  email: string | null
  // The pending email change (Supabase auth.users.email_change, surfaced as
  // user.new_email). Populated for anon users mid-upgrade — they've called
  // updateUser({ email }) but haven't clicked the confirmation link yet, so
  // `email` is still null and `isAnonymous` is still true. AccountSection uses
  // this to render a "Pending confirmation" state instead of the bare CTA.
  pendingEmail: string | null
  provider: string | null
  createdAt: string | null
  setUser: (user: SetUserPayload) => void
  setDisplayName: (displayName: string | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  userId: null,
  isAnonymous: false,
  displayName: null,
  email: null,
  pendingEmail: null,
  provider: null,
  createdAt: null,
  setUser: ({ userId, isAnonymous, email, pendingEmail, provider, createdAt }) =>
    set({ userId, isAnonymous, email, pendingEmail, provider, createdAt }),
  setDisplayName: (displayName) => set({ displayName }),
  clearUser: () =>
    set({
      userId: null,
      isAnonymous: false,
      displayName: null,
      email: null,
      pendingEmail: null,
      provider: null,
      createdAt: null,
    }),
}))

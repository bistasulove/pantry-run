import { create } from 'zustand'

export interface Member {
  userId: string
  role: 'owner' | 'member'
  displayName: string | null
  joinedAt: string
}

interface HouseholdStore {
  householdId: string | null
  name: string | null
  members: Member[]
  setHousehold: (household: { householdId: string; name: string; members: Member[] }) => void
  clearHousehold: () => void
}

export const useHouseholdStore = create<HouseholdStore>((set) => ({
  householdId: null,
  name: null,
  members: [],
  setHousehold: ({ householdId, name, members }) => set({ householdId, name, members }),
  clearHousehold: () => set({ householdId: null, name: null, members: [] }),
}))

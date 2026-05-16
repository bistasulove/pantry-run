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
  listId: string | null
  members: Member[]
  setHousehold: (household: {
    householdId: string
    name: string
    listId: string
    members: Member[]
  }) => void
  clearHousehold: () => void
}

export const useHouseholdStore = create<HouseholdStore>((set) => ({
  householdId: null,
  name: null,
  listId: null,
  members: [],
  setHousehold: ({ householdId, name, listId, members }) =>
    set({ householdId, name, listId, members }),
  clearHousehold: () => set({ householdId: null, name: null, listId: null, members: [] }),
}))

import { create } from 'zustand'

export interface Member {
  userId: string
  role: 'owner' | 'member'
  displayName: string | null
  joinedAt: string
}

export interface ListSummary {
  id: string
  name: string
  createdAt: string
  createdBy: string | null
}

interface HouseholdStore {
  householdId: string | null
  name: string | null
  members: Member[]
  lists: ListSummary[]
  activeListId: string | null

  setHousehold: (household: {
    householdId: string
    name: string
    members: Member[]
    lists: ListSummary[]
    activeListId: string
  }) => void
  clearHousehold: () => void

  setLists: (lists: ListSummary[]) => void
  setActiveListId: (listId: string) => void
  addList: (list: ListSummary) => void
  updateList: (id: string, patch: Partial<Pick<ListSummary, 'name'>>) => void
  removeList: (id: string) => void
}

export const useHouseholdStore = create<HouseholdStore>((set) => ({
  householdId: null,
  name: null,
  members: [],
  lists: [],
  activeListId: null,

  setHousehold: ({ householdId, name, members, lists, activeListId }) =>
    set({ householdId, name, members, lists, activeListId }),
  clearHousehold: () =>
    set({ householdId: null, name: null, members: [], lists: [], activeListId: null }),

  setLists: (lists) => set({ lists }),
  setActiveListId: (listId) => set({ activeListId: listId }),
  addList: (list) =>
    set((s) => (s.lists.some((l) => l.id === list.id) ? s : { lists: [...s.lists, list] })),
  updateList: (id, patch) =>
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  removeList: (id) => set((s) => ({ lists: s.lists.filter((l) => l.id !== id) })),
}))

'use client'

import { useHouseholdStore, type Member } from '@/store/householdStore'

export interface HouseholdState {
  householdId: string | null
  name: string | null
  members: Member[]
  hasHousehold: boolean
}

export function useHousehold(): HouseholdState {
  const householdId = useHouseholdStore((state) => state.householdId)
  const name = useHouseholdStore((state) => state.name)
  const members = useHouseholdStore((state) => state.members)

  return {
    householdId,
    name,
    members,
    hasHousehold: householdId !== null,
  }
}

'use client'

import { useState } from 'react'

import { useHouseholdStore, type Member } from '@/store/householdStore'

interface HouseholdHydratorProps {
  householdId: string
  name: string
  members: Member[]
  children: React.ReactNode
}

export function HouseholdHydrator({
  householdId,
  name,
  members,
  children,
}: HouseholdHydratorProps) {
  // Seed the store synchronously on first render so children read the hydrated
  // state immediately. useState's lazy initializer runs exactly once per mount.
  useState(() => {
    useHouseholdStore.getState().setHousehold({ householdId, name, members })
    return null
  })

  return <>{children}</>
}

export default HouseholdHydrator

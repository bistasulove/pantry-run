'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

import { useHouseholdStore } from '@/store/householdStore'

// Tags every Sentry event with the current household_id (UUID — operational
// metadata, not PII). Two reasons it lives here:
//   1. Lets you filter Sentry issues by household_id and see how an error
//      clusters across families that share a list.
//   2. Hashed user.id alone can't identify a real user; pairing it with
//      household_id makes Supabase reverse-lookup (household_members table)
//      a one-query operation.
//
// First-paint errors (before the store hydrates) won't have the tag set —
// acceptable since real user errors fire during interaction, well after the
// (app) layout mounts and the household resolves.
export function HouseholdSentryTag() {
  const householdId = useHouseholdStore((s) => s.householdId)

  useEffect(() => {
    Sentry.setTag('household_id', householdId)
  }, [householdId])

  return null
}

export default HouseholdSentryTag

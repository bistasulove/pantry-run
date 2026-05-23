'use client'

import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'
import { useUserStore } from '@/store/userStore'

export interface PresenceMember {
  userId: string
  displayName: string | null
  listId: string | null
}

interface TrackedPayload extends Record<string, unknown> {
  userId: string
  displayName: string | null
  listId: string | null
}

// Household-scoped presence: everyone in the household sees everyone else
// regardless of which list they're on, plus which list each is currently
// viewing. PresenceIndicator uses that to render "Sarah is in Costco Run"
// when she's on a different list than the viewer.
export function usePresence(): PresenceMember[] {
  const householdId = useHouseholdStore((s) => s.householdId)
  const activeListId = useHouseholdStore((s) => s.activeListId)
  const userId = useUserStore((s) => s.userId)
  const displayName = useUserStore((s) => s.displayName)
  const [others, setOthers] = useState<PresenceMember[]>([])

  useEffect(() => {
    if (!householdId || !userId) return
    const supabase = createClient()
    const channel = supabase.channel(`presence:household:${householdId}`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<TrackedPayload>()
        const next: PresenceMember[] = []
        for (const key of Object.keys(state)) {
          if (key === userId) continue
          const entries = state[key]
          if (!entries || entries.length === 0) continue
          // Multiple entries for the same key happen when the same user has
          // two tabs open. Take the most recent — its payload is freshest.
          const last = entries[entries.length - 1]
          next.push({
            userId: last.userId,
            displayName: last.displayName,
            listId: last.listId,
          })
        }
        setOthers(next)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ userId, displayName: displayName ?? null, listId: activeListId })
        }
      })

    return () => {
      setOthers([])
      void supabase.removeChannel(channel)
    }
  }, [householdId, userId, displayName, activeListId])

  return others
}

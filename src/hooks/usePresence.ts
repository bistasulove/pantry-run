'use client'

import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'
import { useUserStore } from '@/store/userStore'

export interface PresenceMember {
  userId: string
  displayName: string | null
}

interface TrackedPayload extends Record<string, unknown> {
  userId: string
  displayName: string | null
}

export function usePresence(): PresenceMember[] {
  const listId = useHouseholdStore((s) => s.listId)
  const userId = useUserStore((s) => s.userId)
  const displayName = useUserStore((s) => s.displayName)
  const [others, setOthers] = useState<PresenceMember[]>([])

  useEffect(() => {
    if (!listId || !userId) return
    const supabase = createClient()
    const channel = supabase.channel(`presence:list:${listId}`, {
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
          // two tabs open. Take the most recent — its displayName is freshest.
          const last = entries[entries.length - 1]
          next.push({ userId: last.userId, displayName: last.displayName })
        }
        setOthers(next)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ userId, displayName: displayName ?? null })
        }
      })

    return () => {
      setOthers([])
      void supabase.removeChannel(channel)
    }
  }, [listId, userId, displayName])

  return others
}

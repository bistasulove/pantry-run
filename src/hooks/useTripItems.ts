'use client'

import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

export type TripItem = Database['public']['Tables']['shopping_trip_items']['Row']

export interface UseTripItemsApi {
  items: TripItem[]
  isLoading: boolean
  error: string | null
}

// Lazy fetch — only call when a TripDetailSheet opens. Trips are append-only,
// so no realtime subscription is needed; the snapshot doesn't change.
// Callers should mount this hook with a stable `key` per trip id so fresh
// trips start from the initial idle state instead of a previous trip's items.
export function useTripItems(tripId: string | null): UseTripItemsApi {
  const [items, setItems] = useState<TripItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tripId) return
    let cancelled = false
    const supabase = createClient()
    void (async () => {
      setIsLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('shopping_trip_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('category', { ascending: true })
        .order('name', { ascending: true })
      if (cancelled) return
      if (fetchError) {
        console.error('[useTripItems] fetch failed', fetchError)
        setError("Couldn't load this trip. Try again.")
        setIsLoading(false)
        return
      }
      setItems(data ?? [])
      setIsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [tripId])

  return { items, isLoading, error }
}

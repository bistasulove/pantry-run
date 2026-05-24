'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useHouseholdStore } from '@/store/householdStore'

export interface TripSummary {
  id: string
  finishedAt: string
  finishedBy: string | null
  itemCount: number
  listId: string | null
  listName: string | null
}

interface TripRow {
  id: string
  finished_at: string
  finished_by: string | null
  item_count: number
  list_id: string | null
  lists: { name: string } | null
}

const PAGE_SIZE = 20

function rowToSummary(row: TripRow): TripSummary {
  return {
    id: row.id,
    finishedAt: row.finished_at,
    finishedBy: row.finished_by,
    itemCount: row.item_count,
    listId: row.list_id,
    listName: row.lists?.name ?? null,
  }
}

export interface UseHistoryApi {
  trips: TripSummary[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

export function useHistory(): UseHistoryApi {
  const householdId = useHouseholdStore((state) => state.householdId)

  const [trips, setTrips] = useState<TripSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep a ref of the current oldest finishedAt so loadMore can paginate
  // without subscribing to the trips array.
  const tripsRef = useRef(trips)
  useEffect(() => {
    tripsRef.current = trips
  }, [trips])

  const fetchFirstPage = useCallback(async (): Promise<void> => {
    if (!householdId) return
    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    // Fetch PAGE_SIZE + 1 to determine hasMore without a separate count query.
    const { data, error: fetchError } = await supabase
      .from('shopping_trips')
      .select('id, finished_at, finished_by, item_count, list_id, lists(name)')
      .eq('household_id', householdId)
      .order('finished_at', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (fetchError) {
      console.error('[useHistory] fetch failed', fetchError)
      setError("Couldn't load shopping history. Try again.")
      setIsLoading(false)
      return
    }
    const rows = (data ?? []) as TripRow[]
    const more = rows.length > PAGE_SIZE
    setTrips(rows.slice(0, PAGE_SIZE).map(rowToSummary))
    setHasMore(more)
    setIsLoading(false)
  }, [householdId])

  const loadMore = useCallback(async (): Promise<void> => {
    if (!householdId) return
    const current = tripsRef.current
    const oldest = current[current.length - 1]
    if (!oldest) return
    setIsLoadingMore(true)
    setError(null)
    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('shopping_trips')
      .select('id, finished_at, finished_by, item_count, list_id, lists(name)')
      .eq('household_id', householdId)
      .lt('finished_at', oldest.finishedAt)
      .order('finished_at', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (fetchError) {
      console.error('[useHistory] load-more failed', fetchError)
      setError("Couldn't load older trips. Try again.")
      setIsLoadingMore(false)
      return
    }
    const rows = (data ?? []) as TripRow[]
    const more = rows.length > PAGE_SIZE
    setTrips((prev) => [...prev, ...rows.slice(0, PAGE_SIZE).map(rowToSummary)])
    setHasMore(more)
    setIsLoadingMore(false)
  }, [householdId])

  useEffect(() => {
    if (!householdId) return
    let cancelled = false
    void (async () => {
      if (cancelled) return
      await fetchFirstPage()
    })()

    const supabase = createClient()
    // Subscribe only to INSERT — shopping_trips is append-only by design (M11).
    // On a new trip we fetch the single row with its join so the prepended
    // entry has the same shape as fetchFirstPage results.
    const channel = supabase
      .channel(`history:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shopping_trips',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const id = (payload.new as { id?: string }).id
          if (!id || cancelled) return
          void (async () => {
            const { data } = await supabase
              .from('shopping_trips')
              .select('id, finished_at, finished_by, item_count, list_id, lists(name)')
              .eq('id', id)
              .maybeSingle()
            if (cancelled || !data) return
            const summary = rowToSummary(data as TripRow)
            setTrips((prev) => {
              if (prev.some((t) => t.id === summary.id)) return prev
              return [summary, ...prev]
            })
          })()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [householdId, fetchFirstPage])

  return {
    trips,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch: fetchFirstPage,
  }
}

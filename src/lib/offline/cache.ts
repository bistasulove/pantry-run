import { openDB, type IDBPDatabase } from 'idb'

import type { Database } from '@/lib/database.types'

type ListItemRow = Database['public']['Tables']['list_items']['Row']

const DB_NAME = 'pantry-run-offline'
// v2: added 'trip-snapshots' for the M12 history first-page cache.
const DB_VERSION = 2
const LIST_STORE = 'list-snapshots'
const TRIP_STORE = 'trip-snapshots'

interface ListSnapshotRecord {
  listId: string
  items: ListItemRow[]
  savedAt: number
}

export interface TripSnapshotEntry {
  id: string
  finishedAt: string
  finishedBy: string | null
  itemCount: number
  listId: string | null
  listName: string | null
}

interface TripSnapshotRecord {
  householdId: string
  trips: TripSnapshotEntry[]
  hasMore: boolean
  savedAt: number
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    // Same DB as the write queue. queue.ts shares DB_VERSION and runs the same
    // store-creation upgrade — whichever module opens first triggers it. Each
    // createObjectStore call is guarded so re-running the upgrade is a no-op.
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(LIST_STORE)) {
          db.createObjectStore(LIST_STORE, { keyPath: 'listId' })
        }
        if (!db.objectStoreNames.contains('write-queue')) {
          db.createObjectStore('write-queue', { keyPath: 'id', autoIncrement: true })
        }
        if (!db.objectStoreNames.contains(TRIP_STORE)) {
          db.createObjectStore(TRIP_STORE, { keyPath: 'householdId' })
        }
      },
    })
  }
  return dbPromise
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

export async function saveListSnapshot(listId: string, items: ListItemRow[]): Promise<void> {
  if (!isBrowser()) return
  const db = await getDb()
  const record: ListSnapshotRecord = { listId, items, savedAt: Date.now() }
  await db.put(LIST_STORE, record)
}

export async function loadListSnapshot(listId: string): Promise<ListItemRow[] | null> {
  if (!isBrowser()) return null
  const db = await getDb()
  const record = (await db.get(LIST_STORE, listId)) as ListSnapshotRecord | undefined
  return record?.items ?? null
}

export async function saveTripsSnapshot(
  householdId: string,
  trips: TripSnapshotEntry[],
  hasMore: boolean,
): Promise<void> {
  if (!isBrowser()) return
  const db = await getDb()
  const record: TripSnapshotRecord = { householdId, trips, hasMore, savedAt: Date.now() }
  await db.put(TRIP_STORE, record)
}

export async function loadTripsSnapshot(
  householdId: string,
): Promise<{ trips: TripSnapshotEntry[]; hasMore: boolean } | null> {
  if (!isBrowser()) return null
  const db = await getDb()
  const record = (await db.get(TRIP_STORE, householdId)) as TripSnapshotRecord | undefined
  if (!record) return null
  return { trips: record.trips, hasMore: record.hasMore }
}

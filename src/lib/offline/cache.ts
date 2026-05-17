import { openDB, type IDBPDatabase } from 'idb'

import type { Database } from '@/lib/database.types'

type ListItemRow = Database['public']['Tables']['list_items']['Row']

const DB_NAME = 'pantry-run-offline'
const DB_VERSION = 1
const STORE = 'list-snapshots'

interface SnapshotRecord {
  listId: string
  items: ListItemRow[]
  savedAt: number
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    // Same DB as the write queue — upgrade is owned by queue.ts. Opening here
    // without an upgrade callback is safe because both modules share DB_VERSION
    // and queue.ts's upgrade creates both stores.
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'listId' })
        }
        if (!db.objectStoreNames.contains('write-queue')) {
          db.createObjectStore('write-queue', { keyPath: 'id', autoIncrement: true })
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
  const record: SnapshotRecord = { listId, items, savedAt: Date.now() }
  await db.put(STORE, record)
}

export async function loadListSnapshot(listId: string): Promise<ListItemRow[] | null> {
  if (!isBrowser()) return null
  const db = await getDb()
  const record = (await db.get(STORE, listId)) as SnapshotRecord | undefined
  return record?.items ?? null
}

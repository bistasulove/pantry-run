import { openDB, type IDBPDatabase } from 'idb'

import type { Database } from '@/lib/database.types'

type ListItemRow = Database['public']['Tables']['list_items']['Row']

// Discriminated union of every mutation `useList` performs against `list_items`.
// Captured at the call site (with all the data needed to replay), then drained
// by the executor against Supabase when the network returns.
//
// Note: M11 removed the `clearChecked` kind — "Finish shopping" calls an RPC
// that mutates three tables atomically and is online-only. The executor still
// silently drops any legacy clearChecked entries that may be sitting in older
// IndexedDB queues.
export type QueuedOp =
  | { kind: 'insert'; row: ListItemRow }
  | {
      kind: 'update'
      id: string
      patch: Partial<
        Pick<
          ListItemRow,
          | 'name'
          | 'category'
          | 'is_checked'
          | 'is_recurring'
          | 'checked_by'
          | 'checked_at'
          | 'quantity'
          | 'quantity_value'
          | 'quantity_unit'
          | 'note'
        >
      >
    }
  | { kind: 'delete'; id: string }

export interface QueuedRecord {
  id: number
  op: QueuedOp
  createdAt: number
}

type QueuedRecordInput = Omit<QueuedRecord, 'id'>

const DB_NAME = 'pantry-run-offline'
// v2: added 'trip-snapshots' for the M12 history first-page cache. Kept in
// lockstep with cache.ts — whichever module opens the DB first runs the
// upgrade, so both upgrade callbacks have to create every store.
const DB_VERSION = 2
const QUEUE_STORE = 'write-queue'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  // Singleton across the tab. SSR-safe because every public fn checks
  // `typeof window` before touching the DB.
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
        }
        if (!db.objectStoreNames.contains('list-snapshots')) {
          db.createObjectStore('list-snapshots', { keyPath: 'listId' })
        }
        if (!db.objectStoreNames.contains('trip-snapshots')) {
          db.createObjectStore('trip-snapshots', { keyPath: 'householdId' })
        }
      },
    })
  }
  return dbPromise
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

export async function enqueue(op: QueuedOp): Promise<void> {
  if (!isBrowser()) return
  const db = await getDb()
  const record: QueuedRecordInput = { op, createdAt: Date.now() }
  await db.add(QUEUE_STORE, record)
}

export async function peekHead(): Promise<QueuedRecord | null> {
  if (!isBrowser()) return null
  const db = await getDb()
  const tx = db.transaction(QUEUE_STORE, 'readonly')
  const cursor = await tx.store.openCursor()
  const record = (cursor?.value as QueuedRecord | undefined) ?? null
  await tx.done
  return record
}

export async function removeHead(id: number): Promise<void> {
  if (!isBrowser()) return
  const db = await getDb()
  await db.delete(QUEUE_STORE, id)
}

export async function queueLength(): Promise<number> {
  if (!isBrowser()) return 0
  const db = await getDb()
  return db.count(QUEUE_STORE)
}

export async function getAllQueued(): Promise<QueuedRecord[]> {
  if (!isBrowser()) return []
  const db = await getDb()
  return (await db.getAll(QUEUE_STORE)) as QueuedRecord[]
}

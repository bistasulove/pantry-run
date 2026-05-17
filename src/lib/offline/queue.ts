import { openDB, type IDBPDatabase } from 'idb'

import type { Database } from '@/lib/database.types'

type ListItemRow = Database['public']['Tables']['list_items']['Row']

// Discriminated union of every mutation `useList` performs against `list_items`.
// Captured at the call site (with all the data needed to replay), then drained
// by the executor against Supabase when the network returns.
export type QueuedOp =
  | { kind: 'insert'; row: ListItemRow }
  | {
      kind: 'update'
      id: string
      patch: Partial<
        Pick<
          ListItemRow,
          'name' | 'category' | 'is_checked' | 'checked_by' | 'checked_at' | 'quantity' | 'note'
        >
      >
    }
  | { kind: 'delete'; id: string }
  | { kind: 'clearChecked'; listId: string }

export interface QueuedRecord {
  id: number
  op: QueuedOp
  createdAt: number
}

type QueuedRecordInput = Omit<QueuedRecord, 'id'>

const DB_NAME = 'pantry-run-offline'
const DB_VERSION = 1
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

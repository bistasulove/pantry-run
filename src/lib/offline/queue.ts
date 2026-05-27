import { openDB, type IDBPDatabase } from 'idb'

import type { Database } from '@/lib/database.types'

type ListItemRow = Database['public']['Tables']['list_items']['Row']
type TaskRow = Database['public']['Tables']['tasks']['Row']

// Discriminated union of every mutation `useList` (list_items) and `useTasks`
// (tasks) performs. Captured at the call site with all the data needed to
// replay, then drained by the executor against Supabase when the network
// returns.
//
// Note: M11 removed the `clearChecked` kind — "Finish shopping" calls an RPC
// that mutates three tables atomically and is online-only. The executor still
// silently drops any legacy clearChecked entries that may be sitting in older
// IndexedDB queues.
//
// M15 deliberately does NOT add a queue kind for LLM categorisation. The
// category_pending flag travels with the queued insert row, and the
// reconnect sweep in useList re-runs categorizeRemote for each pending item
// after the queue drains. Re-categorisation is best-effort, idempotent, and
// retried on every reconnect — no need for durable queueing.
//
// M18 adds task_create / task_update / task_delete. The assignment-push
// fan-out for tasks does NOT travel in the queue: when a queued task_create
// or task_update with an assignee drains successfully, useTasks fires the
// push from the drain callback at that moment. Queueing the HTTP send would
// duplicate retry logic that the queue already implements for the DB write.
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
          | 'category_pending'
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
  | { kind: 'task_create'; row: TaskRow }
  | {
      kind: 'task_update'
      id: string
      patch: Partial<
        Pick<
          TaskRow,
          | 'title'
          | 'notes'
          | 'assignee_id'
          | 'due_date'
          | 'is_completed'
          | 'completed_at'
          | 'completed_by'
        >
      >
      // True iff this update is (or includes) a reassignment to a non-null
      // assignee. The executor fires the assignment push after the row write
      // lands. The API route fetches title + assignee + household from the
      // row server-side, so no payload data is needed here.
      notifyAssignee?: boolean
    }
  | { kind: 'task_delete'; id: string }

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

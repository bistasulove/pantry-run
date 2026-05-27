import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { notifyTaskAssignment } from '@/lib/push/client'

import type { QueuedOp } from './queue'

type Client = SupabaseClient<Database>

export type ExecResult =
  | { ok: true }
  // Network-shaped failure: drain stops here; record stays at the head and we
  // try again on the next online/SUBSCRIBED transition.
  | { ok: false; kind: 'network'; error: unknown }
  // Server rejected the op (RLS, missing row, bad payload). Drain removes the
  // record and surfaces a toast — retrying won't help.
  | { ok: false; kind: 'rejected'; error: unknown }

// A TypeError from fetch (network down, DNS, etc.) is what Supabase surfaces
// when offline. PostgrestError has a `code` field — anything from there is a
// server-side rejection and shouldn't loop.
function classify(error: unknown): 'network' | 'rejected' {
  if (error instanceof TypeError) return 'network'
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    /failed to fetch|network|load failed/i.test((error as { message: string }).message) &&
    // PostgrestError uses 'message' too; differentiate via 'code'/'details' presence.
    !('code' in error)
  ) {
    return 'network'
  }
  return 'rejected'
}

export async function runQueuedOp(client: Client, op: QueuedOp): Promise<ExecResult> {
  try {
    if (op.kind === 'insert') {
      const r = op.row
      const { error } = await client.from('list_items').insert({
        id: r.id,
        list_id: r.list_id,
        added_by: r.added_by ?? undefined,
        name: r.name,
        quantity: r.quantity,
        category: r.category,
        // M15 — pending flag set true for offline keyword-misses; the
        // reconnect sweep clears it after queue drain.
        category_pending: r.category_pending,
        is_checked: r.is_checked,
        checked_by: r.checked_by,
        checked_at: r.checked_at,
        note: r.note,
        sort_order: r.sort_order,
      })
      if (error) return { ok: false, kind: classify(error), error }
      return { ok: true }
    }

    if (op.kind === 'update') {
      const { error } = await client.from('list_items').update(op.patch).eq('id', op.id)
      if (error) return { ok: false, kind: classify(error), error }
      return { ok: true }
    }

    if (op.kind === 'delete') {
      const { error } = await client.from('list_items').delete().eq('id', op.id)
      if (error) return { ok: false, kind: classify(error), error }
      return { ok: true }
    }

    // M18 — tasks. Mirror the list_items shape: insert with the full snapshot,
    // update with the patch, delete by id. RLS gates membership server-side.
    if (op.kind === 'task_create') {
      const r = op.row
      const { error } = await client.from('tasks').insert({
        id: r.id,
        household_id: r.household_id,
        title: r.title,
        notes: r.notes,
        assignee_id: r.assignee_id,
        due_date: r.due_date,
        is_completed: r.is_completed,
        completed_at: r.completed_at,
        completed_by: r.completed_by,
        created_by: r.created_by ?? undefined,
      })
      if (error) return { ok: false, kind: classify(error), error }
      // Created offline with an assignee → fire the push now that the row
      // exists server-side. Fire-and-forget per push/client.ts contract.
      if (r.assignee_id) void notifyTaskAssignment(r.id)
      return { ok: true }
    }

    if (op.kind === 'task_update') {
      const { error } = await client.from('tasks').update(op.patch).eq('id', op.id)
      if (error) return { ok: false, kind: classify(error), error }
      if (op.notifyAssignee) void notifyTaskAssignment(op.id)
      return { ok: true }
    }

    if (op.kind === 'task_delete') {
      const { error } = await client.from('tasks').delete().eq('id', op.id)
      if (error) return { ok: false, kind: classify(error), error }
      return { ok: true }
    }

    // Defensive: pre-M11 `clearChecked` entries may still be sitting in older
    // IndexedDB queues. Drop them silently — "Finish shopping" is online-only
    // now, so there's nothing useful to replay.
    console.warn('[offline-executor] dropping unknown op kind', (op as { kind?: string }).kind)
    return { ok: true }
  } catch (error) {
    return { ok: false, kind: classify(error), error }
  }
}

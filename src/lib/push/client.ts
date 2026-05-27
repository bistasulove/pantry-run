// M18 — Client-side helper for firing the task-assignment push.
//
// Called from two places:
//   1. useTasks (online path) — immediately after a successful Supabase
//      insert/update that landed an assignee.
//   2. The offline queue executor — after a queued task_create / task_update
//      with notifyAssignee drains. Reusing the same helper means the push
//      fan-out is identical regardless of online/offline origin.
//
// Fire-and-forget by design. The route returns { sent, expired, failed } but
// callers don't surface that — the user already saw "Task saved" toast. A
// push delivery failure is one-step-removed from the user's action and
// should never block the UX.

export async function notifyTaskAssignment(taskId: string): Promise<void> {
  try {
    await fetch('/api/push/task-assigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId }),
    })
  } catch (e) {
    // Network failure — the queue does not retry pushes (see queue.ts header).
    // Worst case: the assignee learns about the task next time they open the
    // app via realtime. Logged for diagnostic value, not surfaced to the user.
    console.warn('[notifyTaskAssignment] failed', e)
  }
}

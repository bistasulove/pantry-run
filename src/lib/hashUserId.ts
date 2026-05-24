// SHA-256(userId) truncated to 16 hex chars. Used as the only user identifier
// sent to Sentry — never the raw Supabase user UUID. 16 hex chars (64 bits)
// keeps collision risk negligible across our population while making it
// pointless to attempt a rainbow-table reversal.
export async function hashUserId(userId: string): Promise<string> {
  const data = new TextEncoder().encode(userId)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

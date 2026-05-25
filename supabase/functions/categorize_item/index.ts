// Pantry Run — categorize_item Edge Function (M15)
//
// Resolves a grocery item name to a category using a 3-tier strategy:
//   1. household override (per-household manual corrections)
//   2. global cache (LLM results, shared across all households for cost amortisation)
//   3. LLM (Gemini 2.5 Flash, free tier) — gated by 150 calls/household/day
//
// All writes happen under service-role to bypass RLS on the cache + counter
// tables. User identity is verified via the user-scoped client (the JWT in
// the Authorization header), and household membership is verified via RLS
// on household_members (a user can't see a household they're not in, so a
// missing row from the user-scoped select == not a member).
//
// Hard failures (missing API key, malformed LLM response, rate limit on
// the free tier) are logged via console.error — Supabase Edge Function logs
// are visible in the dashboard. The client surfaces these to Sentry from
// its end (the function's caller turns non-200 + network errors into
// captureException), so we don't bring @sentry/deno into the function runtime.

import { createClient } from 'npm:@supabase/supabase-js@^2'

import { corsHeaders } from '../_shared/cors.ts'
import { classify, LLMError } from './llm.ts'

const DAILY_LIMIT = 150

// All categories the function may return — including 'Other' as a fallback.
// LLM-allowed categories are LLM_CATEGORIES in ./llm.ts (excludes 'Other').
const ALL_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Household',
  'Personal Care',
  'Snacks',
  'Condiments & Sauces',
  'Baby',
  'Pet',
  'Other',
] as const

type Source = 'household' | 'global_cache' | 'llm' | 'rate_limited' | 'error'

interface SuccessBody {
  category: (typeof ALL_CATEGORIES)[number]
  source: Source
}

function jsonResponse(body: SuccessBody, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(category: 'Other', source: Source, status: number): Response {
  return jsonResponse({ category, source }, status)
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

interface RequestBody {
  name?: unknown
  household_id?: unknown
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return errorResponse('Other', 'error', 400)
  }

  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    return errorResponse('Other', 'error', 400)
  }
  if (typeof body.household_id !== 'string' || body.household_id.length === 0) {
    return errorResponse('Other', 'error', 400)
  }

  const rawName = body.name
  const householdId = body.household_id
  const normalised = normalise(rawName)
  if (normalised.length === 0 || normalised.length > 200) {
    return errorResponse('Other', 'error', 400)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse('Other', 'error', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error('[categorize_item] Missing Supabase env vars')
    return errorResponse('Other', 'error', 500)
  }

  // User-scoped client — used only to verify auth + household membership via
  // RLS. The user's JWT is in the Authorization header.
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return errorResponse('Other', 'error', 401)
  }
  const userId = userData.user.id

  // Membership verification: RLS on household_members hides rows for
  // households the caller isn't in, so a missing row == not a member.
  const { data: membership } = await userClient
    .from('household_members')
    .select('user_id')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .maybeSingle()

  if (!membership) {
    return errorResponse('Other', 'error', 403)
  }

  // Service-role client — bypasses RLS for cache reads + writes + counter
  // increments. Never returns user-controlled data without a normalised key
  // check, so service-role exposure is bounded.
  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  // Tier 1: household override (manual user correction).
  const { data: householdHit } = await admin
    .from('household_category_overrides')
    .select('category')
    .eq('household_id', householdId)
    .eq('normalised_name', normalised)
    .maybeSingle()

  if (householdHit && isAllowedCategory(householdHit.category)) {
    await admin.rpc('increment_category_counter', {
      p_household_id: householdId,
      p_kind: 'hit',
    })
    return jsonResponse({ category: householdHit.category, source: 'household' })
  }

  // Tier 2: global cache.
  const { data: globalHit } = await admin
    .from('category_overrides')
    .select('category')
    .eq('normalised_name', normalised)
    .maybeSingle()

  if (globalHit && isAllowedCategory(globalHit.category)) {
    await admin.rpc('increment_category_counter', {
      p_household_id: householdId,
      p_kind: 'hit',
    })
    return jsonResponse({ category: globalHit.category, source: 'global_cache' })
  }

  // Tier 3: LLM. Atomically bump count + cache_misses and read the
  // post-increment count to enforce the 150/day cap.
  const { data: newCount, error: counterError } = await admin.rpc('increment_category_counter', {
    p_household_id: householdId,
    p_kind: 'miss',
  })

  if (counterError || typeof newCount !== 'number') {
    console.error('[categorize_item] Counter increment failed', counterError)
    return errorResponse('Other', 'error', 500)
  }

  if (newCount > DAILY_LIMIT) {
    return jsonResponse({ category: 'Other', source: 'rate_limited' })
  }

  let llmCategory: string
  try {
    const result = await classify(rawName)
    llmCategory = result.category
  } catch (err) {
    if (err instanceof LLMError) {
      console.error(`[categorize_item] LLM ${err.kind}: ${err.message}`)
      // Hard failure — don't write the global cache. Next request retries.
      // 'rate_limit' is from Gemini's own quota (separate from our
      // per-household cap, which we already enforced above).
      return jsonResponse({ category: 'Other', source: 'error' })
    }
    console.error('[categorize_item] LLM unexpected error', err)
    return jsonResponse({ category: 'Other', source: 'error' })
  }

  // Cache the LLM result globally so other households (and this one) skip
  // the LLM call next time. created_by stays unset since the cache is
  // shared, not household-owned.
  const { error: upsertError } = await admin.from('category_overrides').upsert(
    {
      normalised_name: normalised,
      category: llmCategory,
      source: 'llm',
    },
    { onConflict: 'normalised_name' },
  )

  if (upsertError) {
    // Non-fatal — return the LLM result anyway. Worst case: next request for
    // the same name pays for another LLM call.
    console.error('[categorize_item] Global cache upsert failed', upsertError)
  }

  return jsonResponse({ category: llmCategory as SuccessBody['category'], source: 'llm' })
})

function isAllowedCategory(value: string): value is (typeof ALL_CATEGORIES)[number] {
  return (ALL_CATEGORIES as readonly string[]).includes(value)
}

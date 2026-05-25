// Client helper for persisting per-household manual category corrections.
//
// The user picking a category in EditItemSheet writes a row into
// household_category_overrides. An AFTER trigger on that table (see
// migration 20260525000002) propagates the (normalised_name, category)
// pair into the global category_overrides cache with source='manual', so
// every other household benefits from this household's correction on
// future adds. 'Other' picks are deliberately NOT propagated — see the
// migration comment.
//
// Online-only: matches the M11 / M12 pattern for non-list-item writes.
// The user's pick still updates the item locally via the regular item
// update path; only the *cache* write happens here.

import { createClient } from '@/lib/supabase/client'

// Mirror of the Edge Function's normaliser. Both must stay identical or
// reads/writes against category_overrides + household_category_overrides
// will silently miss each other on different whitespace/case variants.
export function normaliseName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

export async function upsertHouseholdOverride(
  householdId: string,
  itemName: string,
  category: string,
  userId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalised = normaliseName(itemName)
  if (normalised.length === 0 || normalised.length > 200) {
    return { ok: false, error: 'Invalid item name' }
  }

  const supabase = createClient()
  const { error } = await supabase.from('household_category_overrides').upsert(
    {
      household_id: householdId,
      normalised_name: normalised,
      category,
      created_by: userId,
    },
    { onConflict: 'household_id,normalised_name' },
  )

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

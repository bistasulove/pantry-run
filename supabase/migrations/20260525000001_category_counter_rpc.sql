-- Pantry Run — M15 Smarter Categories: atomic counter RPC
--
-- The categorize_item Edge Function needs to atomically increment per-day
-- counters and check the 150-calls/day rate limit in one round trip. PostgREST
-- doesn't expose UPSERT-with-RETURNING-the-incremented-value cleanly, so we
-- wrap it in a SECURITY DEFINER function callable via supabase.rpc().
--
-- Two modes:
--   'hit'  — cache hit (household override or global cache). Increments
--            cache_hits only; doesn't bump the rate-limit counter.
--   'miss' — about to call the LLM. Increments count + cache_misses. Returns
--            the post-increment count so the Edge Function can short-circuit
--            on >= 150 without an extra select.
--
-- Only the service-role (used by the Edge Function) is permitted to call
-- this. Authenticated users have no execute grant — they go through the
-- Edge Function path, not direct RPC.

create or replace function public.increment_category_counter(
  p_household_id uuid,
  p_kind text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_kind = 'hit' then
    insert into public.category_request_counters (household_id, day, cache_hits)
    values (p_household_id, current_date, 1)
    on conflict (household_id, day)
    do update set
      cache_hits = category_request_counters.cache_hits + 1,
      updated_at = now()
    returning count into v_count;
    return coalesce(v_count, 0);
  elsif p_kind = 'miss' then
    insert into public.category_request_counters (household_id, day, count, cache_misses)
    values (p_household_id, current_date, 1, 1)
    on conflict (household_id, day)
    do update set
      count = category_request_counters.count + 1,
      cache_misses = category_request_counters.cache_misses + 1,
      updated_at = now()
    returning count into v_count;
    return v_count;
  else
    raise exception 'increment_category_counter: invalid kind %', p_kind;
  end if;
end;
$$;

revoke all on function public.increment_category_counter(uuid, text) from public;
-- service_role retains execute by default; no grant to authenticated.

-- Pantry Run — M15 Smarter Categories: write-through trigger
--
-- The locked M15 decision (#1) is that per-household manual corrections feed
-- back into the global cache. The cleanest implementation is a DB trigger on
-- household_category_overrides: when a member writes or updates a row, the
-- same (normalised_name, category) lands in category_overrides with
-- source='manual'. Future households then skip the LLM call entirely for that
-- name.
--
-- Two deliberate carve-outs:
--   1. 'Other' picks are NOT propagated. A user marking something as 'Other'
--      is a household-local preference (e.g. "I don't want this categorised")
--      and shouldn't undo another household's concrete correction.
--   2. DELETEs don't propagate. The global cache reflects "last category
--      anyone manually chose", not "currently active in household X".
--
-- Last-write-wins on conflict: if households A and B disagree (Pantry vs.
-- Snacks for "boba pearls"), the later edit reaches the global cache. The
-- earlier household keeps its own override locally via the household_-
-- category_overrides row, so they aren't affected.

create or replace function public.propagate_household_override_to_global()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.category <> 'Other' then
    insert into public.category_overrides (normalised_name, category, source)
    values (NEW.normalised_name, NEW.category, 'manual')
    on conflict (normalised_name)
    do update set
      category = excluded.category,
      source = 'manual',
      updated_at = now();
  end if;
  return NEW;
end;
$$;

create trigger household_override_propagate_to_global
  after insert or update on public.household_category_overrides
  for each row execute function public.propagate_household_override_to_global();

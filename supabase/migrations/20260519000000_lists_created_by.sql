-- Pantry Run — M10 lists.created_by + delete policy
--
-- Multiple lists per household (plan.md §11.5 M10) needs a way to say "the
-- creator can delete this list" without giving every member the same power.
-- Adds a created_by column populated automatically from auth.uid() on insert,
-- backfills existing rows with the household owner, and widens the delete
-- policy to "household owner OR original creator".

-- ────────────────────────────────────────────────────────────────────────────
-- Column + backfill
-- ────────────────────────────────────────────────────────────────────────────

alter table public.lists
  add column created_by uuid references auth.users (id) on delete set null default auth.uid();

-- Existing single-list-per-household rows pre-date M10 and have no creator.
-- Assign them to the household owner — they're the only member with delete
-- rights under the old policy anyway, so this preserves observable behaviour.
update public.lists l
   set created_by = (
     select user_id
       from public.household_members
      where household_id = l.household_id
        and role = 'owner'
      limit 1
   )
 where created_by is null;

-- ────────────────────────────────────────────────────────────────────────────
-- Delete policy: owner OR creator
-- ────────────────────────────────────────────────────────────────────────────

drop policy if exists lists_delete_owner on public.lists;

create policy lists_delete_owner_or_creator
  on public.lists for delete
  to authenticated
  using (
    public.is_household_owner(household_id)
    or created_by = auth.uid()
  );

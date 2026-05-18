-- M8 — Item Quantity & Notes
-- Adds structured quantity columns (quantity_value + quantity_unit) to list_items
-- so future features (sort, sum, search) can query numerically. The legacy
-- `quantity text` column from the initial schema stays in place — older rows
-- whose value was written before M8 keep displaying via a fallback in ListItem.
--
-- Notes column already exists from the initial schema; no changes needed for it.

alter table public.list_items
  add column quantity_value numeric(6, 2),
  add column quantity_unit  text;

-- Unit allow-list — kept in sync with src/lib/units.ts UNITS.
alter table public.list_items
  add constraint list_items_quantity_unit_check
  check (
    quantity_unit is null
    or quantity_unit in ('g', 'kg', 'mL', 'L', 'piece', 'can', 'dozen')
  );

-- Value must be positive when set.
alter table public.list_items
  add constraint list_items_quantity_value_positive
  check (quantity_value is null or quantity_value > 0);

-- Set/cleared as a pair — never one without the other.
alter table public.list_items
  add constraint list_items_quantity_pair
  check ((quantity_value is null) = (quantity_unit is null));

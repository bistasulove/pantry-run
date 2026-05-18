// Quantity unit allow-list — must stay in sync with the
// list_items_quantity_unit_check constraint in the M8 migration.
export const UNITS = ['g', 'kg', 'mL', 'L', 'piece', 'can', 'dozen'] as const

export type UnitKey = (typeof UNITS)[number]

export function isUnitKey(value: unknown): value is UnitKey {
  return typeof value === 'string' && (UNITS as readonly string[]).includes(value)
}

// User-facing label for a unit. `piece` is the implicit default when a user
// enters a quantity without picking a unit, so it surfaces as the friendlier
// "Qty" in every UI position (row, picker option).
export function unitLabel(unit: UnitKey): string {
  return unit === 'piece' ? 'Qty' : unit
}

// Display string for the list row: "2 kg", "3 Qty", "12 dozen".
// Trailing zeros on the number are stripped — "2.50" → "2.5", "1.00" → "1".
export function formatQuantity(value: number, unit: UnitKey): string {
  const rounded = Math.round(value * 100) / 100
  const trimmed = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, '')
  return `${trimmed} ${unitLabel(unit)}`
}

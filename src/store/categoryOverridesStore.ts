import { create } from 'zustand'

// Client-side cache of household_category_overrides for the active household.
//
// The keyword pass in detectCategoryKeyword can return a confident match for
// names that the user has explicitly corrected in this household (e.g. our
// keyword dictionary classifies "haldi" as Pantry, but the household may have
// corrected it to Household). Without this cache, addItem would short-circuit
// on the keyword hit and never consult the override — the user's pick would
// be silently ignored on every re-add.
//
// Populated + kept fresh by CategoryOverridesRealtime, mounted in AppShell.
// addItem reads byNormalisedName.get(normalised) before calling
// detectCategoryKeyword so overrides win.

interface CategoryOverridesStore {
  byNormalisedName: Map<string, string>
  isLoaded: boolean
  setAll: (entries: Array<{ normalised_name: string; category: string }>) => void
  apply: (normalisedName: string, category: string) => void
  remove: (normalisedName: string) => void
  clear: () => void
}

export const useCategoryOverridesStore = create<CategoryOverridesStore>((set) => ({
  byNormalisedName: new Map(),
  isLoaded: false,
  setAll: (entries) => {
    const map = new Map<string, string>()
    for (const e of entries) map.set(e.normalised_name, e.category)
    set({ byNormalisedName: map, isLoaded: true })
  },
  apply: (normalisedName, category) =>
    set((s) => {
      const next = new Map(s.byNormalisedName)
      next.set(normalisedName, category)
      return { byNormalisedName: next }
    }),
  remove: (normalisedName) =>
    set((s) => {
      const next = new Map(s.byNormalisedName)
      next.delete(normalisedName)
      return { byNormalisedName: next }
    }),
  clear: () => set({ byNormalisedName: new Map(), isLoaded: false }),
}))

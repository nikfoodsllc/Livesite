/**
 * The allergens a food item can carry (set in the admin, Food Items > Allergens). An item with none ticked has none.
 * Keep this list in step with admin/src/utils/allergens.ts (same keys).
 */
export type AllergenKey = 'milk' | 'eggs' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'gluten' | 'soy' | 'sesame' | 'mustard';

export interface AllergenInfo {
  key: AllergenKey;
  /** short name: "Dairy" */
  label: string;
  /** the hover text: "Contains dairy" */
  description: string;
  /** icon colour and the soft background behind it */
  color: string;
  bg: string;
}

export const ALLERGENS: readonly AllergenInfo[] = [
  { key: 'milk', label: 'Dairy', description: 'Contains dairy', color: '#1D4ED8', bg: '#DBEAFE' },
  { key: 'eggs', label: 'Eggs', description: 'Contains eggs', color: '#A16207', bg: '#FEF3C7' },
  { key: 'fish', label: 'Fish', description: 'Contains fish', color: '#0E7490', bg: '#CFFAFE' },
  { key: 'shellfish', label: 'Shellfish', description: 'Contains shellfish', color: '#B91C1C', bg: '#FEE2E2' },
  { key: 'tree_nuts', label: 'Tree nuts', description: 'Contains tree nuts (almond, cashew, pistachio...)', color: '#7C2D12', bg: '#FFEDD5' },
  { key: 'peanuts', label: 'Peanuts', description: 'Contains peanuts', color: '#92400E', bg: '#FDE68A' },
  { key: 'gluten', label: 'Gluten', description: 'Contains gluten (wheat)', color: '#B45309', bg: '#FEF3C7' },
  { key: 'soy', label: 'Soy', description: 'Contains soy', color: '#15803D', bg: '#DCFCE7' },
  { key: 'sesame', label: 'Sesame', description: 'Contains sesame', color: '#57534E', bg: '#E7E5E4' },
  { key: 'mustard', label: 'Mustard', description: 'Contains mustard', color: '#A16207', bg: '#FEF9C3' },
] as const;

const BY_KEY = new Map<string, AllergenInfo>(ALLERGENS.map((a) => [a.key, a]));

export function isAllergenKey(value: unknown): value is AllergenKey {
  return typeof value === 'string' && BY_KEY.has(value);
}

export function allergenInfo(key: string): AllergenInfo | undefined {
  return BY_KEY.get(key);
}

/** Only the known allergens of a stored value, once each, in the standard order (so the icons always sit in the same place). */
export function cleanAllergens(value: unknown): AllergenKey[] {
  if (!Array.isArray(value)) return [];
  const have = new Set(value.filter(isAllergenKey));
  return ALLERGENS.filter((a) => have.has(a.key)).map((a) => a.key);
}

/** True when the item contains any allergen the customer chose to skip. An item with no allergens never does. */
export function containsSkippedAllergen(itemAllergens: unknown, skip: readonly string[]): boolean {
  if (skip.length === 0) return false;
  const have = cleanAllergens(itemAllergens);
  return have.some((k) => skip.includes(k));
}

import { ObjectId } from 'mongodb';
import { db } from './db';

/**
 * Categories (and sub-categories) an admin has switched to "Unavailable" are hidden from the website. This is the same
 * rule for checkout: an item that is only listed in hidden categories cannot be ordered, even from a cart or an old
 * page that still has it. (The saved flag is `isDraft`.)
 */
export interface MappingRow {
  categoryId: string;
  mappingType?: string;
  day?: string;
}

export interface CategoryRow {
  isDraft: boolean;
  parentId?: string;
}

export type HiddenLookup = {
  mappingsByItem: Map<string, MappingRow[]>;
  categories: Map<string, CategoryRow>;
};

function categoryIsHidden(id: string, categories: Map<string, CategoryRow>): boolean {
  const category = categories.get(id);
  // a category we know nothing about never blocks a sale
  if (!category) return false;
  if (category.isDraft) return true;
  return category.parentId ? categories.get(category.parentId)?.isDraft === true : false;
}

/**
 * Is this item hidden for this delivery date and kind? Only when it is listed there (a day-wise item on that date, or a
 * flat item) and EVERY category it is listed in is hidden. An item listed nowhere is not hidden.
 */
export function itemHiddenForLine(
  mappings: MappingRow[],
  categories: Map<string, CategoryRow>,
  date: string,
  kind: 'flat' | 'day-wise'
): boolean {
  const relevant = mappings.filter((m) => (kind === 'day-wise' ? m.mappingType === 'DAY_WISE' && String(m.day ?? '').trim() === date : m.mappingType !== 'DAY_WISE'));
  if (relevant.length === 0) return false;
  return relevant.every((m) => categoryIsHidden(m.categoryId, categories));
}

const str = (value: unknown): string => String((value as { toString(): string } | undefined)?.toString?.() ?? value);

/** Reads where these items are listed and which of those categories are hidden. Returns null if the database cannot be read (never block a sale for that). */
export async function loadHiddenLookup(foodItemIds: string[]): Promise<HiddenLookup | null> {
  const ids = Array.from(new Set(foodItemIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(id))));
  if (ids.length === 0) return { mappingsByItem: new Map(), categories: new Map() };
  try {
    const mappings = await db.read<{ foodItemId?: unknown; categoryId?: unknown; mappingType?: string; day?: string }>('categoryfoodmapping', {
      foodItemId: { $in: ids.map((id) => new ObjectId(id)) },
    } as never);
    if (!mappings.success || !mappings.data) return null;
    const mappingsByItem = new Map<string, MappingRow[]>();
    const categoryIds = new Set<string>();
    for (const m of mappings.data) {
      if (!m.categoryId) continue;
      const itemId = str(m.foodItemId);
      const categoryId = str(m.categoryId);
      categoryIds.add(categoryId);
      const rows = mappingsByItem.get(itemId) ?? [];
      rows.push({ categoryId, mappingType: m.mappingType, day: m.day });
      mappingsByItem.set(itemId, rows);
    }
    const categories = new Map<string, CategoryRow>();
    const load = async (wanted: string[]) => {
      const need = wanted.filter((id) => !categories.has(id) && /^[0-9a-fA-F]{24}$/.test(id));
      if (need.length === 0) return [] as string[];
      const result = await db.read<{ _id?: unknown; isDraft?: boolean; parentCategoryId?: unknown }>('foodcategories', {
        _id: { $in: need.map((id) => new ObjectId(id)) },
      } as never);
      if (!result.success || !result.data) throw new Error('could not read foodcategories');
      const parents: string[] = [];
      for (const c of result.data) {
        const parentId = c.parentCategoryId ? str(c.parentCategoryId) : undefined;
        categories.set(str(c._id), { isDraft: c.isDraft === true, parentId });
        if (parentId) parents.push(parentId);
      }
      return parents;
    };
    const parents = await load(Array.from(categoryIds));
    await load(parents);
    return { mappingsByItem, categories };
  } catch (error) {
    console.error('loadHiddenLookup failed:', error);
    return null;
  }
}

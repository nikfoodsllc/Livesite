import type { MenuCategory, MenuCategoryChild } from '@/lib/server/menu/categories';

/** The part of a category's items the rule looks at (the shape of buildHomeMenu's categoryItems entries). */
export interface PrunableCategoryItems {
  listingType: 'flat' | 'day-wise';
  foodItems: Array<Record<string, unknown>>;
  dayWiseItems: Record<string, Array<Record<string, unknown>>> | null;
}

/** Items that are really on the menu (switched on, and on a day that is open for day-wise categories). An item that is only sold out still counts. */
function itemsOf(entry: PrunableCategoryItems | undefined): Array<Record<string, unknown>> {
  if (!entry) return [];
  if (entry.listingType === 'flat') return entry.foodItems ?? [];
  return Object.values(entry.dayWiseItems ?? {}).flat();
}

/**
 * A category or sub-category with no items switched on is not shown at all: not its heading, not its chip in the category strip, not
 * its tab. A parent stays when it has items itself or any sub-category that has some.
 *
 * Sub-categories of a day-wise parent (the Food Menu) are not categories of their own on the menu: an item carries the names of its
 * sub-categories, so a sub-category is kept when some item that is on an open day carries it.
 *
 * Nothing is changed in the input; the result has the same shape, just without the empty ones.
 */
export function pruneEmptyCategories<E extends PrunableCategoryItems>(
  categories: MenuCategory[],
  categoryItems: Record<string, E>
): { categories: MenuCategory[]; categoryItems: Record<string, E> } {
  const keptIds = new Set<string>();
  const keptCategories: MenuCategory[] = [];

  for (const category of categories) {
    const own = itemsOf(categoryItems[category._id]).length > 0;
    const children = category.children ?? [];
    const isDayWise = categoryItems[category._id]?.listingType === 'day-wise';

    let keptChildren: MenuCategoryChild[];
    if (children.length === 0) {
      keptChildren = [];
    } else if (isDayWise) {
      const tagged = new Set<string>();
      for (const item of itemsOf(categoryItems[category._id])) {
        for (const id of (item.subCategoryIds as string[] | undefined) ?? []) tagged.add(String(id));
      }
      keptChildren = children.filter((child) => tagged.has(child._id));
    } else {
      keptChildren = children.filter((child) => itemsOf(categoryItems[child._id]).length > 0);
    }

    if (!own && keptChildren.length === 0) continue;
    keptIds.add(category._id);
    for (const child of keptChildren) keptIds.add(child._id);
    keptCategories.push(children.length > 0 ? { ...category, children: keptChildren } : category);
  }

  const prunedItems: Record<string, E> = {};
  for (const [id, entry] of Object.entries(categoryItems)) if (keptIds.has(id)) prunedItems[id] = entry;
  return { categories: keptCategories, categoryItems: prunedItems };
}

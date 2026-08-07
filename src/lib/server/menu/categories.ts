import { db } from '@/lib/server/db';

export type MenuCategoryListingType = 'flat' | 'day-wise';

export interface MenuCategoryChild {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  listingType: MenuCategoryListingType;
  sequence: number;
}

export interface MenuCategory extends MenuCategoryChild {
  children?: MenuCategoryChild[];
}

export async function fetchPublishedCategories(): Promise<MenuCategory[]> {
  const result = await db.read(
    'foodcategories',
    {
      isDraft: { $ne: true },
      parentCategoryId: null,
    },
    { sort: { sequence: 1 } }
  );

  if (!result.success || !result.data) {
    return [];
  }

  const subsResult = await db.read(
    'foodcategories',
    {
      isDraft: { $ne: true },
      parentCategoryId: { $exists: true, $ne: null },
    },
    { sort: { sequence: 1 } }
  );

  const childrenByParentId = new Map<string, MenuCategoryChild[]>();

  if (subsResult.success && subsResult.data) {
    for (const sub of subsResult.data) {
      const rawParent = (sub as { parentCategoryId?: { toString?: () => string } }).parentCategoryId;
      const parentId =
        rawParent && typeof rawParent === 'object' && typeof rawParent.toString === 'function'
          ? rawParent.toString()
          : rawParent != null
            ? String(rawParent)
            : '';
      if (!parentId) continue;

      const row: MenuCategoryChild = {
        _id: sub._id.toString(),
        name: sub.name,
        description: sub.description || '',
        imageUrl: sub.url || sub.imageUrl || '',
        listingType: (sub.listingType || 'flat') as MenuCategoryListingType,
        sequence: sub.sequence || sub.order || 0,
      };
      const list = childrenByParentId.get(parentId);
      if (list) {
        list.push(row);
      } else {
        childrenByParentId.set(parentId, [row]);
      }
    }
  }

  return result.data.map((category) => {
    const id = category._id.toString();
    const children = childrenByParentId.get(id) ?? [];
    return {
      _id: id,
      name: category.name,
      description: category.description || '',
      imageUrl: category.url || category.imageUrl || '',
      listingType: (category.listingType || 'flat') as MenuCategoryListingType,
      sequence: category.sequence || category.order || 0,
      ...(children.length > 0 ? { children } : {}),
    };
  });
}

export function collectAllCategoryIds(categories: MenuCategory[]): string[] {
  const ids: string[] = [];
  for (const category of categories) {
    ids.push(category._id);
    for (const child of category.children ?? []) {
      ids.push(child._id);
    }
  }
  return ids;
}

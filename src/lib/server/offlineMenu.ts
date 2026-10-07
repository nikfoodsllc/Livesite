import { buildHomeMenu, HomeMenuPayload } from '@/lib/server/menu/buildHomeMenu';
import { getCachedHomeMenu, setCachedHomeMenu } from '@/lib/server/menu/homeMenuCache';
import { FoodItem } from '@/types/food';

/**
 * The menu an admin picks from when entering an order: exactly what customers see on the website right now
 * (same builder and cache), so an admin order can only contain items that are really on sale for that day.
 */
export async function loadMenu(): Promise<HomeMenuPayload> {
  const cached = getCachedHomeMenu();
  if (cached) return cached;
  const fresh = await buildHomeMenu();
  setCachedHomeMenu(fresh);
  return fresh;
}

/** Days customers can still order for: not in the past and not past their cutoff. */
export function orderableDates(menu: HomeMenuPayload): HomeMenuPayload['dates'] {
  return menu.dates.filter((d) => !d.isPast && !d.isPastCutoff);
}

/**
 * The menu item for a day and which kind of item it is there, or null when it is not on the menu that day. Flat
 * categories (pickles, batters, sweets...) are on sale every open day that has them switched on; day-wise items only
 * on their own date. (The cutoff of each kind is checked separately, when the order is priced.)
 */
export function findMenuItem(
  menu: HomeMenuPayload,
  date: string,
  foodItemId: string
): { item: FoodItem; kind: 'flat' | 'day-wise' } | null {
  const day = menu.dates.find((d) => d.date === date);
  if (!day) return null;
  for (const category of Object.values(menu.categoryItems)) {
    if (category.listingType === 'flat') {
      if (!day.flatCategoryEnabled) continue;
      const hit = category.foodItems.find((i) => String(i._id) === foodItemId);
      if (hit) return { item: hit as unknown as FoodItem, kind: 'flat' };
    } else {
      if (!day.dayWiseCategoryEnabled) continue;
      const hit = category.dayWiseItems?.[date]?.find((i) => String(i._id) === foodItemId);
      if (hit) return { item: hit as unknown as FoodItem, kind: 'day-wise' };
    }
  }
  return null;
}

import { FoodItem } from '@/types/food';

/** Items that need the details dialog — multiple cart lines allowed per menu item per day. */
export function isFoodCustomizable(item: FoodItem): boolean {
  return Boolean(
    item.hasSpiceLevel ||
    item.hasCombo ||
    (item.portions && item.portions.length > 0)
  );
}

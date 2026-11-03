import { FoodItem } from '@/types/food';

/** What a quick add puts on the cart line when the "Eco containers" switch is on: only for items that offer an eco container. */
export function ecoPreselected(foodItem: Pick<FoodItem, 'isEcoFriendlyContainer' | 'ecoContainerCharge'>, ecoOn: boolean) {
  if (!ecoOn || !foodItem.isEcoFriendlyContainer) return {};
  return { isEcoFriendlyContainer: true, ecoContainerCharge: foodItem.ecoContainerCharge };
}

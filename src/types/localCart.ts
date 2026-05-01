import { FoodItem } from './food';
import { DayType, SpiceLevel } from './cart';

/**
 * LocalStorage Cart Item
 * Represents a single line in the cart (unique variant per delivery day).
 * Keys in LocalCartDay.items are lineId, not foodItemId.
 */
export interface LocalCartItem {
  lineId: string;
  foodItemId: string;
  foodItem: FoodItem;
  quantity: number;
  selectedPortion?: string;
  selectedPortionPrice?: number;
  selectedSpiceLevel?: SpiceLevel;
  isEcoFriendlyContainer?: boolean;
  ecoContainerCharge?: number;
  comboSelections?: Record<string, string[]>; // { sectionId: itemId[] }
  notes?: string;
  unitPrice: number;
  totalPrice: number;
  addedAt: string;
}

/**
 * LocalStorage Cart Day
 * Groups items by delivery day
 */
export interface LocalCartDay {
  day: DayType;
  date: string;
  /** Keys are cart line IDs (UUIDs), not foodItemIds */
  items: Record<string, LocalCartItem>;
}

/**
 * LocalStorage Cart
 */
export interface LocalCart {
  days: {
    [day: string]: LocalCartDay;
  };
  version: string;
  lastUpdated: string;
}

/**
 * Customizations for adding items to cart
 */
export interface CartCustomizations {
  selectedPortion?: string;
  selectedPortionPrice?: number;
  selectedSpiceLevel?: SpiceLevel;
  isEcoFriendlyContainer?: boolean;
  ecoContainerCharge?: number;
  comboSelections?: Record<string, string[]>;
  notes?: string;
}

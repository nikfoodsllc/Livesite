import { FoodItem } from './food';
import { DayType, SpiceLevel } from './cart';

/**
 * LocalStorage Cart Item
 * Represents a single item in the cart with all customizations
 */
export interface LocalCartItem {
  foodItemId: string;
  foodItem: FoodItem; // Store full item data for display without API calls
  quantity: number;
  selectedPortion?: string;
  selectedPortionPrice?: number;
  selectedSpiceLevel?: SpiceLevel;
  isEcoFriendlyContainer?: boolean;
  ecoContainerCharge?: number;
  comboSelections?: Record<string, string[]>; // { sectionId: itemId[] }
  notes?: string;
  unitPrice: number; // Price per single item with customizations
  totalPrice: number; // unitPrice × quantity
  addedAt: string; // ISO timestamp when item was added
}

/**
 * LocalStorage Cart Day
 * Groups items by delivery day
 */
export interface LocalCartDay {
  day: DayType;
  date: string; // ISO date string
  items: {
    [foodItemId: string]: LocalCartItem;
  };
}

/**
 * LocalStorage Cart
 * Complete cart structure stored in localStorage
 */
export interface LocalCart {
  days: {
    [day: string]: LocalCartDay; // Key is DayType ('Monday', 'Tuesday', etc.)
  };
  version: string; // For future migrations if structure changes
  lastUpdated: string; // ISO timestamp
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

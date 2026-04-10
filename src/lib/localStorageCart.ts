import { FoodItem } from '@/types/food';
import { DayType } from '@/types/cart';
import { LocalCart, LocalCartItem, LocalCartDay, CartCustomizations } from '@/types/localCart';
import { generateAvailableDatesFromAPI } from './dayAvailabilityClient';
import { getPSTDateString } from './timezone';

const CART_STORAGE_KEY = 'nikfoods_guest_cart';
const CART_VERSION = '1.0';

/**
 * Get empty cart structure
 */
function getEmptyCart(): LocalCart {
  return {
    days: {},
    version: CART_VERSION,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Migrate cart data from old format to new format
 * Converts comboSelections from Record<string, string> to Record<string, string[]>
 */
function migrateCartData(cart: LocalCart): LocalCart {
  let migrated = false;

  Object.values(cart.days).forEach((day) => {
    Object.values(day.items).forEach((item) => {
      if (item.comboSelections) {
        // Check if any values are strings (old format)
        const hasOldFormat = Object.values(item.comboSelections).some(
          (value) => typeof value === 'string'
        );

        if (hasOldFormat) {
          const newSelections: Record<string, string[]> = {};
          Object.entries(item.comboSelections).forEach(([sectionId, itemId]) => {
            if (typeof itemId === 'string') {
              newSelections[sectionId] = [itemId];
            } else {
              newSelections[sectionId] = itemId;
            }
          });
          item.comboSelections = newSelections;
          migrated = true;
        }
      }
    });
  });

  if (migrated) {
    console.log('[localStorageCart] Cart data migrated to new format');
  }

  return cart;
}

/**
 * Get cart from localStorage
 * Returns empty cart if not found or invalid
 */
export function getCart(): LocalCart {
  if (typeof window === 'undefined') {
    return getEmptyCart();
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return getEmptyCart();
    }

    const cart = JSON.parse(stored) as LocalCart;

    // Validate cart structure
    if (!cart.days || !cart.version) {
      console.warn('Invalid cart structure, resetting');
      return getEmptyCart();
    }

    // Migrate cart data to new format if needed
    const migratedCart = migrateCartData(cart);

    // Save migrated cart back to storage
    if (migratedCart !== cart) {
      saveCart(migratedCart);
    }

    return migratedCart;
  } catch (error) {
    console.error('Error reading cart from localStorage:', error);
    return getEmptyCart();
  }
}

/**
 * Save cart to localStorage
 */
function saveCart(cart: LocalCart): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    cart.lastUpdated = new Date().toISOString();
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}

/**
 * Calculate unit price with customizations
 */
function calculateUnitPrice(
  foodItem: FoodItem,
  customizations: CartCustomizations
): number {
  let price = foodItem.price;

  // Add portion price if selected (replaces base price)
  if (customizations.selectedPortionPrice) {
    price = customizations.selectedPortionPrice;
  }

  // Add eco container charge
  if (customizations.isEcoFriendlyContainer && customizations.ecoContainerCharge) {
    price += customizations.ecoContainerCharge;
  }

  // Add combo selections pricing
  if (customizations.comboSelections && foodItem.sections) {
    Object.entries(customizations.comboSelections).forEach(([sectionId, selectedItems]) => {
      const section = foodItem.sections?.find((s) => s._id === sectionId);
      if (section) {
        // Handle both string (single) and array (multi) selections
        const itemIds = Array.isArray(selectedItems) ? selectedItems : [selectedItems];

        itemIds.forEach((itemId) => {
          const selectedItem = section.selectedItems.find((item) => item._id === itemId);
          if (selectedItem && selectedItem.price > 0) {
            price += selectedItem.price;
          }
        });
      }
    });
  }

  return price;
}

/**
 * Add or update item in cart
 */
export function addItem(
  day: DayType,
  date: string,
  foodItem: FoodItem,
  quantity: number,
  customizations: CartCustomizations = {}
): LocalCart {
  console.log('[localStorageCart] addItem called with:', {
    day,
    date,
    foodItem,
    quantity,
    customizations
  });

  const cart = getCart();

  // Initialize day if it doesn't exist
  if (!cart.days[day]) {
    cart.days[day] = {
      day,
      date,
      items: {},
    };
  }

  const unitPrice = calculateUnitPrice(foodItem, customizations);
  const totalPrice = unitPrice * quantity;

  console.log('[localStorageCart] Calculated prices:', {
    unitPrice,
    totalPrice,
    selectedPortion: customizations.selectedPortion,
    selectedPortionPrice: customizations.selectedPortionPrice
  });

  // Create or update cart item
  cart.days[day].items[foodItem._id] = {
    foodItemId: foodItem._id,
    foodItem,
    quantity,
    selectedPortion: customizations.selectedPortion,
    selectedPortionPrice: customizations.selectedPortionPrice,
    selectedSpiceLevel: foodItem.hasSpiceLevel ? customizations.selectedSpiceLevel : undefined,
    isEcoFriendlyContainer: customizations.isEcoFriendlyContainer,
    ecoContainerCharge: customizations.ecoContainerCharge,
    comboSelections: customizations.comboSelections,
    notes: customizations.notes,
    unitPrice,
    totalPrice,
    addedAt: new Date().toISOString(),
  };

  console.log('[localStorageCart] Cart item created:', cart.days[day].items[foodItem._id]);
  console.log('[localStorageCart] About to save cart:', cart);

  saveCart(cart);

  console.log('[localStorageCart] Cart saved. Current cart:', getCart());

  return cart;
}

/**
 * Update quantity for an item
 */
export function updateQuantity(
  day: DayType,
  foodItemId: string,
  newQuantity: number
): LocalCart {
  const cart = getCart();

  if (!cart.days[day]?.items[foodItemId]) {
    console.warn(`Item ${foodItemId} not found in cart for ${day}`);
    return cart;
  }

  if (newQuantity <= 0) {
    // Remove item if quantity is 0 or less
    return removeItem(day, foodItemId);
  }

  const item = cart.days[day].items[foodItemId];
  item.quantity = newQuantity;
  item.totalPrice = item.unitPrice * newQuantity;

  saveCart(cart);
  return cart;
}

/**
 * Remove item from cart
 */
export function removeItem(day: DayType, foodItemId: string): LocalCart {
  const cart = getCart();

  if (!cart.days[day]?.items[foodItemId]) {
    return cart;
  }

  delete cart.days[day].items[foodItemId];

  // Remove day if no items left
  if (Object.keys(cart.days[day].items).length === 0) {
    delete cart.days[day];
  }

  saveCart(cart);
  return cart;
}

/**
 * Get items for a specific day
 */
export function getItemsForDay(day: DayType): LocalCartItem[] {
  const cart = getCart();

  if (!cart.days[day]) {
    return [];
  }

  return Object.values(cart.days[day].items);
}

/**
 * Get quantity for specific day and food item
 */
export function getDayQuantity(day: DayType, foodItemId: string): number {
  const cart = getCart();

  if (!cart.days[day]?.items[foodItemId]) {
    return 0;
  }

  return cart.days[day].items[foodItemId].quantity;
}

/**
 * Get total item count across all days
 */
export function getItemCount(): number {
  const cart = getCart();
  let count = 0;

  Object.values(cart.days).forEach((day) => {
    Object.values(day.items).forEach((item) => {
      count += item.quantity;
    });
  });

  return count;
}

/**
 * Get cart summary with totals
 */
export function getCartSummary(): {
  itemCount: number;
  subtotal: number;
  dayCount: number;
} {
  const cart = getCart();
  let itemCount = 0;
  let subtotal = 0;

  Object.values(cart.days).forEach((day) => {
    Object.values(day.items).forEach((item) => {
      itemCount += item.quantity;
      subtotal += item.totalPrice;
    });
  });

  return {
    itemCount,
    subtotal,
    dayCount: Object.keys(cart.days).length,
  };
}

/**
 * Clear entire cart
 */
export function clearCart(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing cart:', error);
  }
}

/**
 * Clear items for a specific day
 */
export function clearDay(day: DayType): LocalCart {
  const cart = getCart();

  if (cart.days[day]) {
    delete cart.days[day];
    saveCart(cart);
  }

  return cart;
}

/**
 * Get all cart days sorted by date
 * Fetches enabled dates from API to determine sort order dynamically
 */
export async function getAllDays(): Promise<LocalCartDay[]> {
  // First, remove items from past dates (before today)
  await removePastDateItems();

  const cart = getCart();
  const days = Object.values(cart.days);

  // Fetch enabled dates from API to get correct sort order
  const dateOptions = await generateAvailableDatesFromAPI(false);

  // Create a map of day name to date string for sorting
  // In the new date-based system, we sort by actual calendar date
  const dateMap = new Map<string, string>();
  dateOptions.forEach((option) => {
    if (option.day) {
      dateMap.set(option.day, option.date);
    }
  });

  // Sort days by their calendar date
  return days.sort((a, b) => {
    const dateA = dateMap.get(a.day) ?? '9999-12-31';
    const dateB = dateMap.get(b.day) ?? '9999-12-31';
    return dateA.localeCompare(dateB);
  });
}

/**
 * Check if cart has any items
 */
export function hasItems(): boolean {
  const cart = getCart();
  return Object.keys(cart.days).length > 0;
}

/**
 * Prepare cart data for API migration (when user logs in)
 * Converts localStorage cart to API cart format
 */
export function prepareForAPIMigration(): Array<{
  foodItemId: string;
  quantity: number;
  day: string;
  date: string;
  selectedSpiceLevel?: string;
  selectedPortion?: string;
  isEcoFriendlyContainer?: boolean;
  comboSelections?: Record<string, string[]>;
  notes?: string;
}> {
  const cart = getCart();
  const apiCartItems: Array<{
    foodItemId: string;
    quantity: number;
    day: string;
    date: string;
    selectedSpiceLevel?: string;
    selectedPortion?: string;
    isEcoFriendlyContainer?: boolean;
    comboSelections?: Record<string, string[]>;
    notes?: string;
  }> = [];

  Object.values(cart.days).forEach((day) => {
    Object.values(day.items).forEach((item) => {
      apiCartItems.push({
        foodItemId: item.foodItemId,
        quantity: item.quantity,
        day: day.day,
        date: day.date,
        selectedSpiceLevel: item.selectedSpiceLevel,
        selectedPortion: item.selectedPortion,
        isEcoFriendlyContainer: item.isEcoFriendlyContainer,
        comboSelections: item.comboSelections,
        notes: item.notes,
      });
    });
  });

  return apiCartItems;
}

/**
 * Remove cart items for days that are now disabled
 * This should be called when cart is loaded to clean up invalid items
 *
 * NOTE: Time-based cutoff logic has been removed.
 * Days are now enabled/disabled solely by admin panel settings.
 * This function only removes days where enabled=false in database.
 *
 * @returns Promise containing removed days and the updated cart
 */
export async function removeDisabledDayItems(): Promise<{ removedDays: DayType[]; cart: LocalCart }> {
  const cart = getCart();
  const removedDays: DayType[] = [];

  // Get all dates with their enabled status
  const dateOptions = await generateAvailableDatesFromAPI(true);

  // Create a Set of disabled day names (days that are not enabled)
  const disabledDays = new Set<string>(
    dateOptions
      .filter((option) => !option.enabled && option.day)
      .map((option) => option.day!)
  );

  // Iterate through cart days and remove disabled ones
  const cartDayKeys = Object.keys(cart.days) as DayType[];

  for (const dayKey of cartDayKeys) {
    if (disabledDays.has(dayKey)) {
      // This day is now disabled, remove it from cart
      delete cart.days[dayKey];
      removedDays.push(dayKey);
    }
  }

  // Save the updated cart if any days were removed
  if (removedDays.length > 0) {
    saveCart(cart);
    console.log(`Auto-removed cart items for disabled days: ${removedDays.join(', ')}`);
  }

  return { removedDays, cart };
}

/**
 * Remove cart items for past dates (dates before today)
 * This should be called when cart is loaded to clean up items from previous days
 *
 * Uses PST timezone for date comparison to ensure consistency with the application's
 * canonical timezone.
 *
 * @returns Promise containing removed days and the updated cart
 */
export async function removePastDateItems(): Promise<{ removedDays: DayType[]; cart: LocalCart }> {
  const cart = getCart();
  const removedDays: DayType[] = [];

  // Get today's date in PST timezone
  const todayDate = getPSTDateString();

  // Iterate through cart days and remove past dates
  const cartDayKeys = Object.keys(cart.days) as DayType[];

  for (const dayKey of cartDayKeys) {
    const dayData = cart.days[dayKey];

    // Compare the day's date with today's date
    // If the day's date is before today, remove it from cart
    if (dayData.date < todayDate) {
      // This day is in the past, remove it from cart
      delete cart.days[dayKey];
      removedDays.push(dayKey);
      console.log(`[removePastDateItems] Removed past date: ${dayKey} (${dayData.date})`);
    }
  }

  // Save the updated cart if any days were removed
  if (removedDays.length > 0) {
    saveCart(cart);
    console.log(`[removePastDateItems] Auto-removed cart items for past dates: ${removedDays.join(', ')}`);
  }

  return { removedDays, cart };
}

/**
 * Find which day(s) an item belongs to
 */
export function findDaysWithItem(foodItemId: string): Array<{ day: DayType; date: string; quantity: number }> {
  const cart = getCart();
  const result: Array<{ day: DayType; date: string; quantity: number }> = [];

  for (const [dayKey, dayData] of Object.entries(cart.days)) {
    const item = Object.values(dayData.items).find(item => item.foodItemId === foodItemId);
    if (item) {
      result.push({
        day: dayKey as DayType,
        date: dayData.date,
        quantity: item.quantity
      });
    }
  }

  return result;
}

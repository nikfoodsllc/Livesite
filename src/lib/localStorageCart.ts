import { FoodItem } from '@/types/food';
import { DayType } from '@/types/cart';
import { LocalCart, LocalCartItem, LocalCartDay, CartCustomizations } from '@/types/localCart';
import { generateAvailableDatesFromAPI } from './dayAvailabilityClient';
import { getPSTDateString } from './timezone';

const CART_STORAGE_KEY = 'nikfoods_guest_cart';
const CART_VERSION = '2.0';

function newLineId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getEmptyCart(): LocalCart {
  return {
    days: {},
    version: CART_VERSION,
    lastUpdated: new Date().toISOString(),
  };
}

function normalizeComboSelections(
  sel?: Record<string, string[] | string>
): Record<string, string[]> {
  if (!sel) return {};
  const keys = Object.keys(sel).sort();
  const out: Record<string, string[]> = {};
  for (const k of keys) {
    const v = sel[k];
    out[k] = Array.isArray(v) ? [...v].sort() : [v as string];
  }
  return out;
}

/** Stable signature for merge: same food + same signature => increment quantity */
function customizationSignature(foodItem: FoodItem, c: CartCustomizations): string {
  const portion = c.selectedPortion || '';
  const spice = foodItem.hasSpiceLevel ? String(c.selectedSpiceLevel ?? '') : '';
  const eco = c.isEcoFriendlyContainer ? '1' : '0';
  const notes = c.notes || '';
  const combo = normalizeComboSelections(c.comboSelections as Record<string, string[] | string> | undefined);
  return JSON.stringify({ portion, spice, eco, notes, combo });
}

function signatureFromLine(foodItem: FoodItem, line: LocalCartItem): string {
  return customizationSignature(foodItem, {
    selectedPortion: line.selectedPortion,
    selectedPortionPrice: line.selectedPortionPrice,
    selectedSpiceLevel: line.selectedSpiceLevel,
    isEcoFriendlyContainer: line.isEcoFriendlyContainer,
    ecoContainerCharge: line.ecoContainerCharge,
    comboSelections: line.comboSelections,
    notes: line.notes,
  });
}

/**
 * v1.0: day.items keyed by foodItemId, no lineId on items.
 * v2.0: day.items keyed by lineId, each item has lineId.
 */
function migrateV1ToV2(cart: LocalCart): boolean {
  if (cart.version === '2.0') {
    return false;
  }

  Object.values(cart.days).forEach((day) => {
    const oldItems = day.items as Record<string, LocalCartItem>;
    const newItems: Record<string, LocalCartItem> = {};

    for (const item of Object.values(oldItems)) {
      const lineId = item.lineId || newLineId();
      newItems[lineId] = {
        ...item,
        lineId,
        foodItemId: item.foodItemId || item.foodItem?._id || '',
      };
    }
    day.items = newItems;
  });

  cart.version = '2.0';
  console.log('[localStorageCart] Migrated cart from v1 to v2 (line IDs)');
  return true;
}

/**
 * Migrate comboSelections string values to string[]
 */
function migrateComboSelectionsFormat(cart: LocalCart): boolean {
  let migrated = false;

  Object.values(cart.days).forEach((day) => {
    Object.values(day.items).forEach((item) => {
      if (item.comboSelections) {
        const hasOldFormat = Object.values(item.comboSelections).some((value) => typeof value === 'string');
        if (hasOldFormat) {
          const newSelections: Record<string, string[]> = {};
          Object.entries(item.comboSelections).forEach(([sectionId, itemId]) => {
            if (typeof itemId === 'string') {
              newSelections[sectionId] = [itemId];
            } else {
              newSelections[sectionId] = itemId as string[];
            }
          });
          item.comboSelections = newSelections;
          migrated = true;
        }
      }
    });
  });

  if (migrated) {
    console.log('[localStorageCart] Cart comboSelections format migrated');
  }

  return migrated;
}

function runMigrations(cart: LocalCart): { cart: LocalCart; changed: boolean } {
  if (!cart.version) {
    cart.version = '1.0';
  }
  let changed = false;
  if (migrateV1ToV2(cart)) changed = true;
  if (migrateComboSelectionsFormat(cart)) changed = true;
  return { cart, changed };
}

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

    if (!cart.days) {
      console.warn('Invalid cart structure, resetting');
      return getEmptyCart();
    }

    const { cart: migrated, changed } = runMigrations(cart);
    if (changed) {
      saveCart(migrated);
    }
    return migrated;
  } catch (error) {
    console.error('Error reading cart from localStorage:', error);
    return getEmptyCart();
  }
}

function saveCart(cart: LocalCart): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    cart.version = CART_VERSION;
    cart.lastUpdated = new Date().toISOString();
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}

function calculateUnitPrice(foodItem: FoodItem, customizations: CartCustomizations): number {
  let price = foodItem.price;

  if (customizations.selectedPortionPrice) {
    price = customizations.selectedPortionPrice;
  }

  if (customizations.isEcoFriendlyContainer && customizations.ecoContainerCharge) {
    price += customizations.ecoContainerCharge;
  }

  if (customizations.comboSelections && foodItem.sections) {
    Object.entries(customizations.comboSelections).forEach(([sectionId, selectedItems]) => {
      const section = foodItem.sections?.find((s) => s._id === sectionId);
      if (section) {
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

export function getLinesForFoodOnDay(day: DayType, foodItemId: string): LocalCartItem[] {
  const cart = getCart();
  const dayData = cart.days[day];
  if (!dayData?.items) return [];
  return Object.values(dayData.items).filter((li) => li.foodItemId === foodItemId);
}

export function getFirstLineForFoodOnDay(day: DayType, foodItemId: string): LocalCartItem | undefined {
  const lines = getLinesForFoodOnDay(day, foodItemId);
  return lines[0];
}

/**
 * Add or merge line: same food + same customization signature => increment quantity; else new line.
 */
export function addItem(
  day: DayType,
  date: string,
  foodItem: FoodItem,
  quantity: number,
  customizations: CartCustomizations = {}
): LocalCart {
  const cart = getCart();

  if (!cart.days[day]) {
    cart.days[day] = {
      day,
      date,
      items: {},
    };
  }

  const sig = customizationSignature(foodItem, customizations);
  const existing = Object.values(cart.days[day].items).find(
    (li) => li.foodItemId === foodItem._id && signatureFromLine(foodItem, li) === sig
  );

  if (existing) {
    existing.quantity += quantity;
    existing.totalPrice = existing.unitPrice * existing.quantity;
    existing.foodItem = foodItem;
    saveCart(cart);
    return cart;
  }

  const unitPrice = calculateUnitPrice(foodItem, customizations);
  const totalPrice = unitPrice * quantity;
  const lineId = newLineId();

  cart.days[day].items[lineId] = {
    lineId,
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

  saveCart(cart);
  return cart;
}

export function updateQuantity(day: DayType, lineId: string, newQuantity: number): LocalCart {
  const cart = getCart();

  if (!cart.days[day]?.items[lineId]) {
    console.warn(`Line ${lineId} not found in cart for ${day}`);
    return cart;
  }

  if (newQuantity <= 0) {
    return removeItem(day, lineId);
  }

  const item = cart.days[day].items[lineId];
  item.quantity = newQuantity;
  item.totalPrice = item.unitPrice * newQuantity;

  saveCart(cart);
  return cart;
}

export function removeItem(day: DayType, lineId: string): LocalCart {
  const cart = getCart();

  if (!cart.days[day]?.items[lineId]) {
    return cart;
  }

  delete cart.days[day].items[lineId];

  if (Object.keys(cart.days[day].items).length === 0) {
    delete cart.days[day];
  }

  saveCart(cart);
  return cart;
}

/** Remove every cart line for this menu item on the given day (e.g. dialog quantity 0). */
export function removeAllLinesForFood(day: DayType, foodItemId: string): LocalCart {
  const cart = getCart();
  const dayData = cart.days[day];
  if (!dayData?.items) return cart;

  const lineIds = Object.values(dayData.items)
    .filter((li) => li.foodItemId === foodItemId)
    .map((li) => li.lineId);

  lineIds.forEach((id) => {
    delete cart.days[day].items[id];
  });

  if (Object.keys(cart.days[day].items).length === 0) {
    delete cart.days[day];
  }

  saveCart(cart);
  return cart;
}

/**
 * Decrease total units of this food on this day by one (newest line first).
 */
export function decrementOneUnitForFoodOnDay(day: DayType, foodItemId: string): LocalCart {
  const lines = getLinesForFoodOnDay(day, foodItemId);
  if (lines.length === 0) return getCart();

  const sorted = [...lines].sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
  const line = sorted[0];
  if (line.quantity > 1) {
    return updateQuantity(day, line.lineId, line.quantity - 1);
  }
  return removeItem(day, line.lineId);
}

export function getItemsForDay(day: DayType): LocalCartItem[] {
  const cart = getCart();
  if (!cart.days[day]) {
    return [];
  }
  return Object.values(cart.days[day].items);
}

/** Sum of quantities across all lines for this menu item on this day. */
export function getDayQuantity(day: DayType, foodItemId: string): number {
  return getLinesForFoodOnDay(day, foodItemId).reduce((sum, li) => sum + li.quantity, 0);
}

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

export function clearDay(day: DayType): LocalCart {
  const cart = getCart();

  if (cart.days[day]) {
    delete cart.days[day];
    saveCart(cart);
  }

  return cart;
}

export async function getAllDays(): Promise<LocalCartDay[]> {
  await removePastDateItems();

  const cart = getCart();
  const days = Object.values(cart.days);

  const dateOptions = await generateAvailableDatesFromAPI(false);

  const dateMap = new Map<string, string>();
  dateOptions.forEach((option) => {
    if (option.day) {
      dateMap.set(option.day, option.date);
    }
  });

  return days.sort((a, b) => {
    const dateA = dateMap.get(a.day) ?? '9999-12-31';
    const dateB = dateMap.get(b.day) ?? '9999-12-31';
    return dateA.localeCompare(dateB);
  });
}

export function hasItems(): boolean {
  const cart = getCart();
  return Object.keys(cart.days).length > 0;
}

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

export async function removeDisabledDayItems(): Promise<{ removedDays: DayType[]; cart: LocalCart }> {
  const cart = getCart();
  const removedDays: DayType[] = [];

  const dateOptions = await generateAvailableDatesFromAPI(true);

  const disabledDays = new Set<string>(
    dateOptions.filter((option) => !option.enabled && option.day).map((option) => option.day!)
  );

  const cartDayKeys = Object.keys(cart.days) as DayType[];

  for (const dayKey of cartDayKeys) {
    if (disabledDays.has(dayKey)) {
      delete cart.days[dayKey];
      removedDays.push(dayKey);
    }
  }

  if (removedDays.length > 0) {
    saveCart(cart);
    console.log(`Auto-removed cart items for disabled days: ${removedDays.join(', ')}`);
  }

  return { removedDays, cart };
}

export async function removePastDateItems(): Promise<{ removedDays: DayType[]; cart: LocalCart }> {
  const cart = getCart();
  const removedDays: DayType[] = [];

  const todayDate = getPSTDateString();

  const cartDayKeys = Object.keys(cart.days) as DayType[];

  for (const dayKey of cartDayKeys) {
    const dayData = cart.days[dayKey];

    if (dayData.date < todayDate) {
      delete cart.days[dayKey];
      removedDays.push(dayKey);
      console.log(`[removePastDateItems] Removed past date: ${dayKey} (${dayData.date})`);
    }
  }

  if (removedDays.length > 0) {
    saveCart(cart);
    console.log(`[removePastDateItems] Auto-removed cart items for past dates: ${removedDays.join(', ')}`);
  }

  return { removedDays, cart };
}

export function findDaysWithItem(foodItemId: string): Array<{ day: DayType; date: string; quantity: number }> {
  const cart = getCart();
  const result: Array<{ day: DayType; date: string; quantity: number }> = [];

  for (const [dayKey, dayData] of Object.entries(cart.days)) {
    const lines = Object.values(dayData.items).filter((li) => li.foodItemId === foodItemId);
    const qty = lines.reduce((s, li) => s + li.quantity, 0);
    if (qty > 0) {
      result.push({
        day: dayKey as DayType,
        date: dayData.date,
        quantity: qty,
      });
    }
  }

  return result;
}

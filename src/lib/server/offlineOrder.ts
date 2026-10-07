import { Cart, CartDay, CartItem, SpiceLevel } from '@/types/cart';
import { FoodItem } from '@/types/food';
import {
  calculateCartClubbing,
  calculateCartSubtotal,
  calculateDayTotal,
  calculateItemCount,
  calculateTax,
  DEFAULT_MIN_CART_VALUE,
  getPlatformFee,
} from '@/lib/cartLogic';

/**
 * Builds the cart of an order an admin enters for a customer (a phone or in-person order).
 *
 * The browser never sends prices: every unit price is worked out here from the menu item itself, with the same
 * rules the customer site uses (portion price, plus the eco container charge, plus priced combo choices), so an
 * admin order is totalled exactly like a website order. The totals reuse the shared cart logic.
 */

/** One line the admin picked: which item, on which delivery day, and how it is customised. */
export interface OfflineLineInput {
  /** Delivery (menu) day, 'YYYY-MM-DD' */
  date: string;
  foodItemId: string;
  quantity: number;
  /** Portion label exactly as the item lists it ('16Oz') */
  selectedPortion?: string;
  selectedSpiceLevel?: string;
  isEcoFriendlyContainer?: boolean;
  /** { comboSectionId: [chosen option ids] } */
  comboSelections?: Record<string, string[]>;
  notes?: string;
}

export interface OfflineAddressInput {
  street_address: string;
  apartment?: string;
  city: string;
  state?: string;
  postal_code: string;
  /** Gate / entrance code */
  entrance?: string;
  /** Delivery instructions */
  floor?: string;
  landmark?: string;
}

export interface LineProblem {
  index: number;
  message: string;
}

export const MAX_LINE_QUANTITY = 99;
export const MAX_NOTE_CHARS = 300;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Weekday name ('Wednesday') of a 'YYYY-MM-DD' calendar date. */
export function weekdayOf(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

const money = (n: number) => Math.round(n * 100 + 1e-9) / 100;

/**
 * Checks one line against its menu item and works out its unit price.
 * Returns the problem (a sentence for the admin) or the finished cart item.
 */
export function priceLine(
  line: OfflineLineInput,
  item: FoodItem,
  index: number,
  listingType?: 'flat' | 'day-wise'
): { item: CartItem } | { problem: string } {
  const name = item.name;
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QUANTITY) {
    return { problem: `${name}: quantity must be a whole number from 1 to ${MAX_LINE_QUANTITY}` };
  }
  if (line.notes && line.notes.length > MAX_NOTE_CHARS) {
    return { problem: `${name}: the note is too long (${MAX_NOTE_CHARS} characters at most)` };
  }

  let unitPrice = Number(item.price);
  if (!(unitPrice >= 0)) return { problem: `${name}: this item has no price` };

  // portion: the label must be one the item lists; its price replaces the base price
  let selectedPortionPrice: number | undefined;
  const portions = item.portions ?? [];
  if (portions.length > 0) {
    if (!line.selectedPortion) return { problem: `${name}: choose a size` };
    const at = portions.indexOf(line.selectedPortion);
    if (at < 0) return { problem: `${name}: "${line.selectedPortion}" is not a size of this item` };
    const portionPrice = item.portionPrices?.[at];
    if (portionPrice !== undefined && portionPrice !== null) {
      selectedPortionPrice = Number(portionPrice);
      unitPrice = selectedPortionPrice;
    }
  } else if (line.selectedPortion) {
    return { problem: `${name}: this item has no sizes` };
  }

  // spice level
  let selectedSpiceLevel: SpiceLevel | undefined;
  if (item.hasSpiceLevel) {
    const levels = item.spiceLevel ?? [];
    if (levels.length > 0) {
      if (!line.selectedSpiceLevel) return { problem: `${name}: choose a spice level` };
      if (!levels.includes(line.selectedSpiceLevel)) {
        return { problem: `${name}: "${line.selectedSpiceLevel}" is not a spice level of this item` };
      }
      selectedSpiceLevel = line.selectedSpiceLevel as SpiceLevel;
    }
  } else if (line.selectedSpiceLevel) {
    return { problem: `${name}: this item has no spice level` };
  }

  // eco container
  let ecoContainerCharge: number | undefined;
  if (line.isEcoFriendlyContainer) {
    if (!item.isEcoFriendlyContainer) return { problem: `${name}: this item has no eco container option` };
    ecoContainerCharge = Number(item.ecoContainerCharge) || 0;
    unitPrice += ecoContainerCharge;
  }

  // combo choices: sections the item defines, within each section's minimum and maximum
  const comboSelections: Record<string, string[]> = {};
  if (item.hasCombo && item.sections?.length) {
    for (const section of item.sections) {
      const chosen = [...new Set(line.comboSelections?.[section._id] ?? [])];
      const optionIds = new Set(section.selectedItems.map((o) => o._id));
      const unknown = chosen.find((id) => !optionIds.has(id));
      if (unknown) return { problem: `${name}: an option picked for "${section.title}" is not part of this combo` };
      const min = section.isRequired ? Math.max(section.minSelection || 0, 1) : section.minSelection || 0;
      if (chosen.length < min) {
        return { problem: `${name}: choose at least ${min} for "${section.title}"` };
      }
      if (section.maxSelection && chosen.length > section.maxSelection) {
        return { problem: `${name}: choose no more than ${section.maxSelection} for "${section.title}"` };
      }
      if (chosen.length > 0) comboSelections[section._id] = chosen;
      for (const id of chosen) {
        const option = section.selectedItems.find((o) => o._id === id);
        if (option && option.price > 0) unitPrice += option.price;
      }
    }
    const unexpected = Object.keys(line.comboSelections ?? {}).find((id) => !item.sections?.some((s) => s._id === id));
    if (unexpected) return { problem: `${name}: a combo section that does not exist was sent` };
  } else if (line.comboSelections && Object.keys(line.comboSelections).length > 0) {
    return { problem: `${name}: this item is not a combo` };
  }

  unitPrice = money(unitPrice);
  const totalPrice = money(unitPrice * line.quantity);
  return {
    item: {
      _id: `offline-${index}`,
      foodItem: item,
      quantity: line.quantity,
      day: weekdayOf(line.date),
      date: line.date,
      selectedSpiceLevel,
      selectedPortion: portions.length > 0 ? line.selectedPortion : undefined,
      selectedPortionPrice,
      isEcoFriendlyContainer: line.isEcoFriendlyContainer ? true : undefined,
      ecoContainerCharge,
      comboSelections: Object.keys(comboSelections).length > 0 ? comboSelections : undefined,
      notes: line.notes?.trim() || undefined,
      listingType,
      price: unitPrice,
      subtotal: totalPrice,
      totalPrice,
    },
  };
}

export interface OfflineTotals {
  subtotal: number;
  platformFee: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  total: number;
}

/** Tip choices on the checkout page are a percentage of the subtotal. */
export const TIP_PERCENTAGES = [0, 5, 10, 15] as const;

export interface BuiltOfflineCart {
  cart: Cart;
  totals: OfflineTotals;
  minOrderValue: number;
  deliveryMessages: string[];
}

/**
 * Groups the priced items by day, applies the cart clubbing rule (a day under the minimum is combined with the
 * next one) and totals the order. `waivePlatformFee` drops the Platform Fee (and the tax that would be charged on it).
 */
export function buildOfflineCart(params: {
  items: CartItem[];
  address: OfflineAddressInput;
  minOrderValue?: number;
  tipPercentage: number;
  waivePlatformFee?: boolean;
}): BuiltOfflineCart {
  const { items, address, tipPercentage, waivePlatformFee } = params;
  const minOrderValue = params.minOrderValue && params.minOrderValue > 0 ? params.minOrderValue : DEFAULT_MIN_CART_VALUE;

  const byDate = new Map<string, CartItem[]>();
  for (const item of items) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);

  const cartDays: CartDay[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({
      _id: `offline-${date}`,
      day: weekdayOf(date),
      date,
      items: dayItems,
      subtotal: calculateDayTotal(dayItems),
      dayTotal: calculateDayTotal(dayItems),
      meetsMinimum: false,
    }));

  const clubbing = calculateCartClubbing(cartDays, minOrderValue);
  const days = cartDays.map((day, index) => ({
    ...day,
    deliveryMessage: clubbing.deliveryMessages[index] || undefined,
    meetsMinimum: clubbing.clubbedDays[index]?.meetsMinimum || false,
  }));

  const subtotal = money(calculateCartSubtotal(days));
  const platformFee = waivePlatformFee ? 0 : getPlatformFee(subtotal);
  const tax = calculateTax(subtotal, platformFee);
  const tip = money((subtotal * tipPercentage) / 100);
  const total = money(subtotal + platformFee + tax + tip);

  const cart: Cart = {
    _id: 'offline-cart',
    userId: 'admin',
    days,
    selectedAddress: {
      _id: 'offline-address',
      addressLine1: address.street_address,
      addressLine2: address.apartment,
      city: address.city,
      state: address.state || 'WA',
      zipCode: address.postal_code,
      landmark: address.landmark,
      entrance: address.entrance,
      floor: address.floor,
      isDefault: false,
    },
    subtotal,
    tax,
    deliveryFee: 0,
    platformFee,
    totalAmount: money(subtotal + platformFee + tax),
    itemCount: calculateItemCount(days),
    canCheckout: clubbing.canCheckout,
  } as Cart;

  return {
    cart,
    totals: { subtotal, platformFee, deliveryFee: 0, tax, tip, total },
    minOrderValue,
    deliveryMessages: days.filter((d) => d.deliveryMessage).map((d) => d.deliveryMessage!.message),
  };
}

export { DATE_RE };

import { CartDay, CartItem, DeliveryMessage } from '@/types/cart';
import { ZipcodeConfig } from '@/types/zipcode';
import { getPSTWeekday } from './timezone';

// Helper function to create timezone-safe date for day name extraction
// Creates date at noon PST (20:00 UTC) to avoid DST boundary issues
const getDateForDayName = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 20)); // noon PST
};

/**
 * Business-defined pricing constants for cart calculations
 *
 * NOTE: These are fixed values defined by the business.
 * In future, these could be fetched from an API endpoint to allow
 * dynamic configuration without code changes.
 */

/**
 * Tax rate applied to cart subtotal
 * @constant {number} TAX_RATE - 10.2% (0.102)
 */
export const TAX_RATE = 0.102;

/**
 * Service fee rate applied to cart subtotal
 * @constant {number} SERVICE_FEE_RATE - 4% (0.04)
 */
export const SERVICE_FEE_RATE = 0.04;

/**
 * Base delivery fee (delivery is now always free)
 * @constant {number} BASE_DELIVERY_FEE - $10.00
 * @deprecated - Delivery is now always free, this constant is no longer used
 */
export const BASE_DELIVERY_FEE = 10.0;

/**
 * Order subtotal threshold for free delivery
 * @constant {number} FREE_DELIVERY_THRESHOLD - Delivery is now always free
 * @deprecated - Delivery is now always free, this constant is no longer used
 */
export const FREE_DELIVERY_THRESHOLD = 100.0;

/**
 * Default minimum cart value per day for checkout eligibility
 * @constant {number} DEFAULT_MIN_CART_VALUE - $25.00 per day minimum
 */
export const DEFAULT_MIN_CART_VALUE = 25.0;

/**
 * Result of cart clubbing calculation
 */
export interface CartClubbingResult {
  canCheckout: boolean;
  clubbedDays: CartDay[];
  deliveryMessages: (DeliveryMessage | undefined)[];
  totalShortfall: number;
}



/**
 * Calculates the total for a single cart day
 */
export function calculateDayTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const itemTotal = item.totalPrice || item.subtotal || 0;
    return sum + itemTotal;
  }, 0);
}

/**
 * Calculates cart clubbing logic - determines which days meet minimum order value
 * and which days need to be clubbed together for delivery
 *
 * @param cartDays - Array of cart days with items
 * @param minCartValue - Minimum cart value required for delivery
 * @returns CartClubbingResult with delivery messages and checkout status
 */
export function calculateCartClubbing(
  cartDays: CartDay[],
  minCartValue: number = DEFAULT_MIN_CART_VALUE
): CartClubbingResult {
  const result: CartClubbingResult = {
    canCheckout: false,
    clubbedDays: [],
    deliveryMessages: [],
    totalShortfall: 0,
  };

  if (!cartDays.length) {
    return result;
  }

  // Sort days by date for analysis
  const sortedDays = [...cartDays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate individual day totals
  const dayAnalysis = sortedDays.map((day) => {
    const dayTotal = calculateDayTotal(day.items);
    const shortfall = Math.max(0, minCartValue - dayTotal);
    const meetsMinimum = dayTotal >= minCartValue;

    return {
      ...day,
      dayTotal,
      shortfall,
      meetsMinimum,
    };
  });

  // Get the last day of the week (last day in the sequence)
  const lastDayOfWeek = dayAnalysis[dayAnalysis.length - 1];

  // Check if any individual day meets minimum
  const daysMeetingMinimum = dayAnalysis.filter((day) => day.meetsMinimum);

  // Create maps to store results by day ID for original order mapping
  const clubbedDaysMap = new Map<string, any>();
  const deliveryMessagesMap = new Map<string, DeliveryMessage | undefined>();

  if (daysMeetingMinimum.length > 0) {
    // At least one day meets minimum - can checkout
    result.canCheckout = true;

    // Process each day individually
    dayAnalysis.forEach((day) => {
      const dayId = day._id || day.day;

      if (day.meetsMinimum) {
        // Day meets minimum - same day delivery
        clubbedDaysMap.set(dayId, {
          ...day,
        });
        // No message needed for days that meet minimum
        deliveryMessagesMap.set(dayId, undefined);
      } else {
        // Day doesn't meet minimum - club with last day of the week
        clubbedDaysMap.set(dayId, {
          ...day,
        });

        // Get day name for the current day
        const currentDayName = getPSTWeekday(getDateForDayName(day.date));
        const deliveryDayName = getPSTWeekday(getDateForDayName(lastDayOfWeek.date));

        // Store message for this day with day name and consequence
        deliveryMessagesMap.set(dayId, {
          type: 'warning',
          message: `Add $${day.shortfall.toFixed(2)} more to ${currentDayName} to meet minimum value. Items will be delivered on ${deliveryDayName}.`,
          deliveryDay: lastDayOfWeek.day,
          hasShortfall: true,
        });
      }
    });
  } else {
    // No individual day meets minimum - check if clubbing to last day meets minimum
    const totalCartValue = dayAnalysis.reduce((sum, day) => sum + day.dayTotal, 0);

    if (totalCartValue >= minCartValue) {
      // Can checkout with clubbing - all items go to the last day of the week
      result.canCheckout = true;

      dayAnalysis.forEach((day) => {
        const dayId = day._id || day.day;

        clubbedDaysMap.set(dayId, {
          ...day,
        });

        if (day.day === lastDayOfWeek.day) {
          // Last day of week - no success message needed
          deliveryMessagesMap.set(dayId, undefined);
        } else {
          // Store message for this day with day name and consequence
          const currentDayName = getPSTWeekday(getDateForDayName(day.date));
          const deliveryDayName = getPSTWeekday(getDateForDayName(lastDayOfWeek.date));

          deliveryMessagesMap.set(dayId, {
            type: 'warning',
            message: `Add $${day.shortfall.toFixed(2)} more to ${currentDayName} to meet minimum value. Items will be delivered on ${deliveryDayName}.`,
            deliveryDay: lastDayOfWeek.day,
            hasShortfall: true,
          });
        }
      });
    } else {
      // Cannot checkout - clubbing to last day still doesn't meet minimum
      result.canCheckout = false;
      result.totalShortfall = minCartValue - totalCartValue;

      dayAnalysis.forEach((day) => {
        const dayId = day._id || day.day;

        clubbedDaysMap.set(dayId, {
          ...day,
        });

        // For the error case, add individual shortfall message to each day with day name
        const currentDayName = getPSTWeekday(getDateForDayName(day.date));

        deliveryMessagesMap.set(dayId, {
          type: 'error',
          message: `Min order value not met for ${currentDayName}. Add $${day.shortfall.toFixed(2)} worth of items to proceed.`,
          hasShortfall: true,
        });
      });
    }
  }

  // Map results back to original cartDays order using day ID
  result.clubbedDays = cartDays.map((day) => {
    const dayId = day._id || day.day;
    return clubbedDaysMap.get(dayId);
  });

  result.deliveryMessages = cartDays.map((day) => {
    const dayId = day._id || day.day;
    return deliveryMessagesMap.get(dayId);
  });

  return result;
}

/**
 * Gets a checkout message if cart cannot proceed to checkout
 *
 * @param cartDays - Array of cart days
 * @param minCartValue - Minimum cart value
 * @returns Error message if cannot checkout, empty string otherwise
 */
export function getCheckoutMessage(
  cartDays: CartDay[],
  minCartValue: number
): string {
  const clubbingResult = calculateCartClubbing(cartDays, minCartValue);

  if (!clubbingResult.canCheckout) {
    return `The minimum order price hasn't been reached yet. Add another $${clubbingResult.totalShortfall.toFixed(2)} to complete the order.`;
  }

  return '';
}

/**
 * Calculates sales tax based on the subtotal and service fee
 *
 * @param subtotal - The cart subtotal before tax
 * @param serviceFee - The platform service fee amount
 * @returns The calculated tax amount
 */
export function calculateTax(subtotal: number, serviceFee: number = 0): number {
  return Number(((subtotal + serviceFee) * TAX_RATE).toFixed(2));
}

/**
 * Calculates the platform service fee based on cart subtotal
 *
 * @param subtotal - The cart subtotal before fees
 * @returns The calculated platform fee (4% of subtotal)
 */
export function getPlatformFee(subtotal: number): number {
  return Number((subtotal * SERVICE_FEE_RATE).toFixed(2));
}

/**
 * Calculates the delivery fee - always returns 0 for free delivery
 *
 * @param subtotal - The cart subtotal (unused - delivery is always free)
 * @param zipcodeDeliveryFee - Optional zipcode-specific delivery fee (unused - delivery is always free)
 * @returns Always returns 0 for free delivery
 */
export function calculateDeliveryFee(subtotal: number, zipcodeDeliveryFee?: number): number {
  // Delivery is always free regardless of order amount
  return 0;
}

/**
 * Calculates the total cart price including all fees and taxes
 *
 * @param subtotal - The cart subtotal
 * @param discount - Applied discount amount (default 0)
 * @param zipcodeDeliveryFee - Optional zipcode-specific delivery fee
 * @returns Object containing the detailed price breakdown
 */
export function calculateTotalPrice(
  subtotal: number,
  discount: number = 0,
  zipcodeDeliveryFee?: number
): {
  subtotal: number;
  tax: number;
  taxRate: number;
  platformFee: number;
  deliveryFee: number;
  discount: number;
  total: number;
} {
  const platformFee = getPlatformFee(subtotal);
  const tax = calculateTax(subtotal, platformFee);
  const deliveryFee = calculateDeliveryFee(subtotal, zipcodeDeliveryFee);
  const total = subtotal + tax + platformFee + deliveryFee - discount;

  return {
    subtotal,
    tax,
    taxRate: TAX_RATE,
    platformFee,
    deliveryFee,
    discount,
    total: Number(total.toFixed(2)),
  };
}

/**
 * Calculates the discount amount based on coupon parameters
 *
 * @param subtotal - The cart subtotal
 * @param coupon - The coupon details
 * @returns The calculated discount amount
 */
export function calculateCouponDiscount(
  subtotal: number,
  coupon: {
    discountType: 'percentage' | 'fixed';
    value: number;
    maxDiscount?: number;
  }
): number {
  let discountAmount = 0;

  if (coupon.discountType === 'percentage') {
    // Calculate percentage discount
    discountAmount = (subtotal * coupon.value) / 100;

    // Apply maximum discount if specified
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else {
    // Fixed discount
    discountAmount = coupon.value;

    // Ensure discount doesn't exceed cart total
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }
  }

  return Number(discountAmount.toFixed(2));
}

/**
 * Formats a price value for display
 *
 * @param price - The price to format
 * @returns Formatted price string with 2 decimal places
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Calculates the subtotal for all cart days
 *
 * @param cartDays - Array of cart days
 * @returns Total subtotal across all days
 */
export function calculateCartSubtotal(cartDays: CartDay[]): number {
  return cartDays.reduce((total, day) => {
    return total + calculateDayTotal(day.items);
  }, 0);
}

/**
 * Counts total items across all cart days
 *
 * @param cartDays - Array of cart days
 * @returns Total item count
 */
export function calculateItemCount(cartDays: CartDay[]): number {
  return cartDays.reduce((total, day) => {
    return total + day.items.reduce((dayTotal, item) => dayTotal + item.quantity, 0);
  }, 0);
}

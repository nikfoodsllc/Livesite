import { CartDay, CartItem } from '@/types/cart';
import { PST_TIMEZONE } from './timezone';

/**
 * Minimum order value per day for delivery eligibility
 * @constant {number} MINIMUM_ORDER_VALUE - $20.00 per day minimum
 */
export const MINIMUM_ORDER_VALUE = 20.0;

/**
 * Information about a day's delivery calculation
 */
export interface DayDeliveryInfo {
  originalDay: string;
  originalDate: string;
  actualDeliveryDate: string;
  items: CartItem[];
  dayTotal: number;
}

/**
 * Result of delivery date calculation
 */
export interface DeliveryCalculationResult {
  deliveryDays: DayDeliveryInfo[];
}

/**
 * Calculates delivery dates for cart days based on minimum order value
 *
 * Algorithm (per docs/delivery_dates_logic.md):
 * 1. Pre-check: If total cart value < MIN, block the cart (return empty result)
 * 2. Forward scan with accumulation:
 *    - Start a chain, accumulate values until ACC >= MIN
 *    - Before finalizing, check if remaining tail can reach MIN on its own
 *    - If tail cannot reach MIN, MUST extend the chain (even if ACC >= MIN)
 *    - Only finalize when ACC >= MIN AND tail can resolve itself
 * 3. Finalization: Deliver on the last day of the chain
 *
 * Core Rule: A delivery chain MUST continue forward if finalizing it would
 * leave any future date that cannot reach MIN on its own or with remaining dates.
 *
 * @param cartDays - Array of cart days with items and calculated dayTotal
 * @param minimumOrderValue - Minimum order value per day (default: $20.00)
 * @returns DeliveryCalculationResult with delivery day information
 *
 * @example
 * ```typescript
 * const cartDays: CartDay[] = [
 *   { day: 'Tuesday', date: '2024-01-16', items: [...], dayTotal: 25.00, ... },
 *   { day: 'Wednesday', date: '2024-01-17', items: [...], dayTotal: 15.00, ... },
 *   { day: 'Thursday', date: '2024-01-18', items: [...], dayTotal: 30.00, ... },
 * ];
 *
 * const result = calculateDeliveryDates(cartDays);
 * // Result depends on lookahead for stranded tail prevention
 * ```
 */
export function calculateDeliveryDates(
  cartDays: CartDay[],
  minimumOrderValue: number = MINIMUM_ORDER_VALUE
): DeliveryCalculationResult {
  const result: DeliveryCalculationResult = {
    deliveryDays: [],
  };

  // Return empty result if no cart days
  if (!cartDays.length) {
    return result;
  }

  // Sort cart days by date chronologically
  const sortedDays = [...cartDays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Step 1: Pre-check - validate total cart value
  const totalCartValue = sortedDays.reduce((sum, day) => sum + day.dayTotal, 0);
  if (totalCartValue < minimumOrderValue) {
    // Blocked cart - no valid delivery plan exists
    return result;
  }

  // Step 2: Initialize
  let chainStart = 0;
  let i = 0;

  // Step 3: Single forward scan
  while (i < sortedDays.length) {
    // Add current day to running total
    i++;

    // Calculate remaining tail (days after i)
    let remainingTotal = 0;
    for (let j = i; j < sortedDays.length; j++) {
      remainingTotal += sortedDays[j].dayTotal;
    }

    // Calculate current chain total
    let chainTotal = 0;
    for (let k = chainStart; k < i; k++) {
      chainTotal += sortedDays[k].dayTotal;
    }

    // Check if we've reached minimum and can make a decision
    if (chainTotal >= minimumOrderValue) {
      // We can deliver this chain
      // But first check if remaining tail can stand alone
      if (remainingTotal === 0) {
        // No more dates - finalize chain
        const deliveryDate = sortedDays[i - 1].date;
        for (let k = chainStart; k < i; k++) {
          result.deliveryDays.push({
            originalDay: sortedDays[k].day,
            originalDate: sortedDays[k].date,
            actualDeliveryDate: deliveryDate,
            items: sortedDays[k].items,
            dayTotal: sortedDays[k].dayTotal,
          });
        }
        break;
      }

      if (remainingTotal >= minimumOrderValue) {
        // Tail can stand alone - safe to finalize
        const deliveryDate = sortedDays[i - 1].date;
        for (let k = chainStart; k < i; k++) {
          result.deliveryDays.push({
            originalDay: sortedDays[k].day,
            originalDate: sortedDays[k].date,
            actualDeliveryDate: deliveryDate,
            items: sortedDays[k].items,
            dayTotal: sortedDays[k].dayTotal,
          });
        }
        // Start new chain
        chainStart = i;
      }
      // else: tail cannot stand alone - keep extending (don't finalize yet)
    }
    // else: chainTotal < minimum - keep accumulating
  }

  return result;
}

/**
 * Formats delivery date for display
 *
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Tuesday, Jan 16")
 */
export function formatDeliveryDate(dateString: string): string {
  /*
   * Parse date components and format with PST timezone
   * See: docs/standards/date-handling-convention.md
   *
   * Creates date at noon PST (20:00 UTC) to avoid DST boundary issues.
   * This ensures the date string "2025-01-15" is always interpreted as
   * January 15 in PST timezone, regardless of server timezone.
   */
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at noon PST (20:00 UTC = noon PST, 21:00 UTC = noon PDT)
  const date = new Date(Date.UTC(year, month - 1, day, 20));
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: PST_TIMEZONE,
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Checks if a day is being delivered on a different date than originally ordered
 *
 * @param dayInfo - Day delivery information
 * @returns true if delivery date differs from original date
 */
export function isDeliveryDateDifferent(dayInfo: DayDeliveryInfo): boolean {
  return dayInfo.originalDate !== dayInfo.actualDeliveryDate;
}

/**
 * Gets all unique delivery dates from the calculation result
 *
 * @param result - Delivery calculation result
 * @returns Array of unique delivery dates sorted chronologically
 */
export function getUniqueDeliveryDates(result: DeliveryCalculationResult): string[] {
  const uniqueDates = new Set<string>();

  result.deliveryDays.forEach((day) => {
    uniqueDates.add(day.actualDeliveryDate);
  });

  // Timezone-neutral timestamp comparison for sorting date strings (YYYY-MM-DD format)
  return Array.from(uniqueDates).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
}

/**
 * Groups delivery information by actual delivery date
 *
 * @param result - Delivery calculation result
 * @returns Record mapping delivery dates to array of day info
 */
export function groupByDeliveryDate(
  result: DeliveryCalculationResult
): Record<string, DayDeliveryInfo[]> {
  const grouped: Record<string, DayDeliveryInfo[]> = {};

  result.deliveryDays.forEach((day) => {
    if (!grouped[day.actualDeliveryDate]) {
      grouped[day.actualDeliveryDate] = [];
    }
    grouped[day.actualDeliveryDate].push(day);
  });

  return grouped;
}

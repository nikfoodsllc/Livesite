import { Cart, CartDay } from '@/types/cart';
import { Order, OrderDay, AddressSnapshot, CustomerInfo } from '@/types/order';
import {
  getPSTNow,
  isPSTToday,
  PST_TIMEZONE,
} from './timezone';
import { DeliveryCalculationResult } from '@/lib/deliveryCalculator';

/**
 * Generates a unique order ID
 * Format: ORD-{timestamp}{random}
 * Note: # is added in UI for display only
 */
export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}${random}`;
}

/**
 * Converts Cart items to Order items with snapshots
 * @param cartDays - Array of cart days
 * @param deliveryCalculationResults - Optional delivery calculation results
 * @returns Array of OrderDay objects with actual delivery dates if provided
 */
export function convertCartToOrderItems(
  cartDays: CartDay[],
  deliveryCalculationResults?: DeliveryCalculationResult
): OrderDay[] {
  // Create a map of original date to actual delivery date for quick lookup
  const deliveryDateMap = new Map<string, string>();
  if (deliveryCalculationResults) {
    deliveryCalculationResults.deliveryDays.forEach((dayInfo) => {
      deliveryDateMap.set(dayInfo.originalDate, dayInfo.actualDeliveryDate);
    });
  }

  return cartDays.map((cartDay) => {
    const actualDeliveryDate = deliveryDateMap.get(cartDay.date);

    return {
      day: cartDay.day,
      deliveryDate: cartDay.date,
      actualDeliveryDate: actualDeliveryDate || undefined,
      items: cartDay.items.map((item) => ({
        food: {
          _id: item.foodItem._id,
          name: item.foodItem.name,
          price: item.foodItem.price,
          image: item.foodItem.url,
          category: item.foodItem.category,
          description: item.foodItem.description,
          veg: item.foodItem.veg,
          hasSpiceLevel: item.foodItem.hasSpiceLevel,
          spiceLevel: item.foodItem.spiceLevel,
          portions: item.foodItem.portions,
          portionPrices: item.foodItem.portionPrices,
          hasCombo: item.foodItem.hasCombo,
          sections: item.foodItem.sections,
        },
        quantity: item.quantity,
        price: item.price,
        spiceLevel: item.selectedSpiceLevel,
        selectedPortion: item.selectedPortion,
        portions: item.selectedPortion ? parseInt(item.selectedPortion) : undefined,
        isEcoFriendlyContainer: item.isEcoFriendlyContainer,
        ecoContainerCharge: item.ecoContainerCharge,
        comboSelections: item.comboSelections,
        notes: item.notes,
      })),
      dayTotal: cartDay.dayTotal,
    };
  });
}

/**
 * Creates address snapshot from cart selected address
 */
export function createAddressSnapshot(address: NonNullable<Cart['selectedAddress']>): AddressSnapshot {
  return {
    street: address.addressLine1,
    apartment: address.addressLine2,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    landmark: address.landmark,
  };
}

/**
 * Creates customer info from form data
 */
export function createCustomerInfo(
  name: string,
  email: string,
  phone: string
): CustomerInfo {
  return {
    name,
    email,
    phone,
  };
}

/**
 * Checks if a delivery date is for today (in PST timezone)
 *
 * @param dateString - The date string to check
 * @returns true if the date is today in PST
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  return isPSTToday(date);
}

/**
 * Calculates tip amount from percentage
 */
export function calculateTipAmount(subtotal: number, tipPercentage: number): number {
  return Number(((subtotal * tipPercentage) / 100).toFixed(2));
}

/**
 * Formats order for database storage
 */
export function formatOrderForDatabase(order: Order): Order & { createdAt: Date; updatedAt: Date } {
  return {
    ...order,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Gets the color for an order status badge
 */
export function getStatusColor(status: Order['status']): string {
  const colors: Record<Order['status'], string> = {
    pending: '#F59E0B', // amber
    confirmed: '#3B82F6', // blue
    preparing: '#8B5CF6', // purple
    ready: '#06B6D4', // cyan
    out_for_delivery: '#10B981', // emerald
    delivered: '#0A9750', // green
    cancelled: '#EF4444', // red
  };
  return colors[status];
}

/**
 * Gets the display label for an order status
 */
export function getStatusLabel(status: Order['status']): string {
  const labels: Record<Order['status'], string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

/**
 * Checks if an order is active (not delivered or cancelled)
 */
export function isOrderActive(status: Order['status']): boolean {
  return ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(status);
}

/**
 * Checks if an order can be tracked
 */
export function canTrackOrder(status: Order['status']): boolean {
  return isOrderActive(status);
}

/**
 * Checks if an order can be reordered
 */
export function canReorder(status: Order['status']): boolean {
  return status === 'delivered';
}

/**
 * Checks if an order can be reviewed
 */
export function canReview(status: Order['status'], hasReview?: boolean): boolean {
  return status === 'delivered' && !hasReview;
}

/**
 * Checks if an order can be updated
 */
export function canUpdateOrder(status: Order['status']): boolean {
  return status === 'confirmed';
}

/**
 * Formats date for order display (in PST timezone)
 * Example: "Aug 02, 2025, 03:30 PM"
 *
 * @param date - The date to format
 * @returns Formatted date string in PST
 */
export function formatOrderDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: PST_TIMEZONE,
  });
}

/**
 * Formats delivery date (in PST timezone)
 * Example: "Monday, Aug 05, 2025"
 *
 * @param date - The date to format
 * @returns Formatted date string in PST
 */
export function formatDeliveryDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: PST_TIMEZONE,
  });
}

/**
 * Gets delivery status chip color based on day
 */
export function getDeliveryDayColor(status: Order['status']): string {
  if (status === 'delivered') return '#0A9750'; // green
  if (status === 'cancelled') return '#EF4444'; // red
  return '#3B82F6'; // blue for active orders
}

/**
 * Formats currency amount
 */
export function formatCurrency(amount: number, currency: string = 'usd'): string {
  const symbol = currency === 'usd' ? '$' : '₹';
  return `${symbol}${amount.toFixed(2)}`;
}

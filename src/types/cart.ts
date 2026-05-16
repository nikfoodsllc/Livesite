import { FoodItem } from './food';

/**
 * Date Type - ISO date format string (e.g., "2024-01-15")
 * Used for date-based cart operations and storage
 */
export type DateType = string;

/**
 * Day Type - Delivery days
 * @deprecated Kept for backward compatibility with existing cart data.
 * New code should use DateType for date operations.
 * This field will be removed once all cart data is migrated to use 'date' field.
 */
export type DayType = string;

/**
 * Spice Level Type
 */
export type SpiceLevel = 'Mild' | 'Normal' | 'Medium' | 'Semi-Spicy' | 'Super-Spicy';

/**
 * Delivery Message Type for cart clubbing
 */
export interface DeliveryMessage {
  type: 'success' | 'warning' | 'error';
  message: string;
  deliveryDay?: DayType;
  hasShortfall?: boolean;
}

/**
 * Cart Item Interface
 *
 * Migration Notes:
 * - Both 'day' and 'date' fields exist during the transition period
 * - 'day' field: Legacy field using DayType (kept for backward compatibility)
 * - 'date' field: New field using ISO date format string (preferred)
 * - New code should use 'date' field for all date operations
 * - Both fields may be present in existing cart data during migration
 */
export interface CartItem {
  _id: string;
  foodItem: FoodItem;
  quantity: number;
  /** @deprecated Legacy field - use 'date' field instead */
  day: DayType;
  /** Preferred field for date operations (ISO date format) */
  date: string;
  selectedCustomizations?: SelectedCustomization[];
  selectedSpiceLevel?: SpiceLevel;
  selectedPortion?: string;
  selectedPortionPrice?: number;
  isEcoFriendlyContainer?: boolean;
  ecoContainerCharge?: number;
  comboSelections?: Record<string, string[]>; // { sectionId: itemId[] }
  notes?: string;
  price: number;
  subtotal: number;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Selected Customization Interface
 */
export interface SelectedCustomization {
  customizationId: string;
  customizationName: string;
  optionId: string;
  optionName: string;
  price: number;
}

/**
 * Cart Day Interface - Groups items by delivery day
 *
 * Migration Notes:
 * - Both 'day' and 'date' fields exist during the transition period
 * - 'day' field: Legacy field using DayType (kept for backward compatibility)
 * - 'date' field: New field using ISO date format string (preferred)
 * - New code should use 'date' field for all date operations
 * - Both fields may be present in existing cart data during migration
 */
export interface CartDay {
  _id: string;
  /** @deprecated Legacy field - use 'date' field instead */
  day: DayType;
  /** Preferred field for date operations (ISO date format) */
  date: string;
  /** Formatted date string for display (e.g., "Jan 7, 2026") */
  formattedDate?: string;
  items: CartItem[];
  subtotal: number;
  dayTotal: number;
  deliveryMessage?: DeliveryMessage;
  meetsMinimum: boolean;
}

/**
 * Cart Interface
 */
export interface Cart {
  _id: string;
  userId: string;
  days: CartDay[];
  selectedAddress?: {
    _id: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    landmark?: string;
    /** Gate / buzzer / entrance code (from saved address) */
    entrance?: string;
    /** Delivery instructions (saved address `floor` field in AddressDialog) */
    floor?: string;
    isDefault: boolean;
  };
  subtotal: number;
  tax: number;
  deliveryFee: number;
  platformFee: number;
  totalAmount: number;
  itemCount: number;
  appliedCoupon?: AppliedCoupon;
  canCheckout: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Applied Coupon Interface
 */
export interface AppliedCoupon {
  couponId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
}

/**
 * Cart Summary Interface - For calculations display
 */
export interface CartSummary {
  subtotal: number;
  tax: number;
  taxRate: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  total: number;
  itemCount: number;
}

/**
 * Add to Cart Request
 */
export interface AddToCartRequest {
  foodItemId: string;
  quantity: number;
  day: DayType;
  date: string;
  selectedCustomizations?: SelectedCustomization[];
  selectedSpiceLevel?: SpiceLevel;
  selectedPortion?: string;
  isEcoFriendlyContainer?: boolean;
  comboSelections?: Record<string, string[]>; // { sectionId: itemId[] }
  notes?: string;
}

/**
 * Update Cart Item Request
 */
export interface UpdateCartItemRequest {
  cartItemId: string;
  quantity?: number;
  selectedSpiceLevel?: SpiceLevel;
  selectedPortion?: string;
  isEcoFriendlyContainer?: boolean;
  comboSelections?: Record<string, string[]>; // { sectionId: itemId[] }
  notes?: string;
}

/**
 * Remove Cart Item Request
 */
export interface RemoveCartItemRequest {
  cartItemId: string;
}

/**
 * Update Address Request
 */
export interface UpdateCartAddressRequest {
  addressId: string;
}

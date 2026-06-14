export type PaymentMethod = 'Credit Card' | 'Cash on Delivery' | 'Apple Pay';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'retrying';

export interface EmailStatusInfo {
  status: EmailStatus;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  messageId?: string;
}

export interface FoodItemSnapshot {
  _id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  description?: string;
  veg?: boolean;
  hasSpiceLevel?: boolean;
  spiceLevel?: string[];
  portions?: string[]; // Array of portion names (e.g., ["Full", "Half"])
  portionPrices?: number[];
  hasCombo?: boolean;
  sections?: Array<{
    _id: string;
    title: string;
    description?: string;
    selectedItems: Array<{
      _id: string;
      item: {
        _id: string;
        name: string;
        price: number;
      };
      portion?: string;
      price: number;
      isDefault: boolean;
    }>;
  }>; // Combo sections for displaying combo selections
}

export interface OrderDayItem {
  food: FoodItemSnapshot;
  quantity: number;
  price: number;
  spiceLevel?: string;
  selectedPortion?: string; // Portion name (e.g., "Full", "Half")
  portions?: number; // Portion index for backwards compatibility
  isEcoFriendlyContainer?: boolean;
  ecoContainerCharge?: number;
  comboSelections?: Record<string, string[]>; // { sectionId: itemId[] }
  notes?: string;
}

export interface OrderDay {
  day: string; // e.g., "Monday", "Tuesday"
  deliveryDate: Date | string;
  actualDeliveryDate?: Date | string; // Calculated delivery date after clubbing logic
  items: OrderDayItem[];
  dayTotal: number;
}

export interface AddressSnapshot {
  street: string;
  apartment?: string;
  floor?: string;
  city: string;
  state: string;
  zipCode: string;
  landmark?: string;
  /** Gate / buzzer code captured at order time */
  entrance?: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface DiscountInfo {
  amount: number;
  code: string;
}

export interface Order {
  _id?: string;
  orderId: string; // e.g., "#ORD-1234567890123"
  user?: string; // User ID
  items: OrderDay[];
  address: AddressSnapshot;
  customerInfo: CustomerInfo;
  subtotal: number;
  platformFee: number; // $1.00
  deliveryFee: number; // $10.00 or $0
  taxes: number; // 10% of subtotal
  tip: number; // User selected tip
  discount?: DiscountInfo;
  minOrderValue: number; // Minimum order value required for delivery
  totalPaid: number;
  currency: string; // 'usd' | 'inr'
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId?: string; // Only for card payments
  deliveryMessages?: string[]; // Cart clubbing messages
  hasReview?: boolean; // Whether this order has been reviewed
  emailStatus?: EmailStatusInfo; // Track email sending status
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CheckoutFormData {
  name: string;
  email: string;
  phone: string;
  paymentMethod: PaymentMethod;
  tipPercentage: number; // 0, 5, 10, or 15
}

export interface OrderTotals {
  subtotal: number;
  platformFee: number;
  deliveryFee: number;
  taxes: number;
  tip: number;
  discount: number;
  total: number;
}

export interface OrderReview {
  _id?: string;
  orderId: string;
  user: string; // User ID
  rating: number; // 1-5 stars
  comment?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

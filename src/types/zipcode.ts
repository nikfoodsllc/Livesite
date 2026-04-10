export interface Zipcode {
  _id: string;
  zipcode: string;
  minCartValue: number;
  deliveryFee?: number; // Optional: delivery fee for this zipcode
  createdAt: Date;
  updatedAt: Date;
}

export interface ZipcodeConfig {
  zipcode: string;
  minCartValue: number;
  deliveryFee: number;
  configured?: boolean; // true if zipcode has custom config
}

// Default values when zipcode not found
export const DEFAULT_MIN_CART_VALUE = 25;
export const DEFAULT_DELIVERY_FEE = 10;
export const FREE_DELIVERY_THRESHOLD = 100; // @deprecated - Delivery is now always free

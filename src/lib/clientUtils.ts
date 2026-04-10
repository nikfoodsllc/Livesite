import { ZipcodeConfig } from '@/types/zipcode';
import { DEFAULT_MIN_CART_VALUE, BASE_DELIVERY_FEE } from './cartLogic';
import {
  getCachedZipcodeConfig,
  setCachedZipcodeConfig,
} from './zipcodeCache';

/**
 * Fetches zipcode-specific configuration (min cart value and delivery fee)
 * This is a client-side utility function that can be used in client components
 *
 * Uses localStorage caching to avoid redundant API calls:
 * - Checks cache first before making API request
 * - Caches successful API responses for 24 hours
 * - Falls back to API on cache miss or invalid cache
 *
 * @param zipcode - The zipcode to look up
 * @returns Promise with zipcode configuration or defaults
 */
export async function fetchZipcodeConfig(zipcode: string): Promise<ZipcodeConfig> {
  // Check cache first
  const cachedConfig = getCachedZipcodeConfig(zipcode);
  if (cachedConfig) {
    return cachedConfig;
  }

  // Cache miss - fetch from API
  try {
    const response = await fetch(`/api/zipcode-config?zipcode=${encodeURIComponent(zipcode)}`);

    if (!response.ok) {
      // Distinguish between expected 404 (not serviceable) and actual errors
      if (response.status === 404) {
        // This is expected - zipcode not in database (not serviceable)
        console.debug(`Zipcode ${zipcode} is not serviceable (not in database)`);
      } else {
        // This is an actual error (500, 403, etc.)
        console.error('Failed to fetch zipcode config:', response.status, response.statusText);
      }
      return {
        zipcode,
        minCartValue: DEFAULT_MIN_CART_VALUE,
        deliveryFee: BASE_DELIVERY_FEE,
        configured: false,
      };
    }

    const data = await response.json();

    if (data.success && data.data) {
      // Store successful response in cache
      setCachedZipcodeConfig(zipcode, data.data);
      return data.data;
    }

    // Fallback to defaults
    return {
      zipcode,
      minCartValue: DEFAULT_MIN_CART_VALUE,
      deliveryFee: BASE_DELIVERY_FEE,
      configured: false,
    };
  } catch (error) {
    console.error('Error fetching zipcode config:', error);
    // Return defaults on error
    return {
      zipcode,
      minCartValue: DEFAULT_MIN_CART_VALUE,
      deliveryFee: BASE_DELIVERY_FEE,
      configured: false,
    };
  }
}
'use server';

import { ZipcodeConfig, DEFAULT_DELIVERY_FEE } from '@/types/zipcode';
import { DatabaseHandler } from '@/lib/server/db';

export interface ZipcodeValidationResult {
  isServiceable: boolean;
  message?: string;
  config?: ZipcodeConfig;
}

/**
 * Server-side version of the validation function for use in API routes
 * This function avoids the fetch call and directly queries the database
 *
 * @param zipcode - The zip code to validate
 * @param db - Database instance to query
 * @returns Promise with validation result
 */
export async function validateZipcodeServiceabilityServer(
  zipcode: string,
  db: DatabaseHandler
): Promise<ZipcodeValidationResult> {
  try {
    // Basic format validation first
    const zipcodeRegex = /^\d{5}(-\d{4})?$/;
    if (!zipcodeRegex.test(zipcode)) {
      return {
        isServiceable: false,
        message: 'Invalid zip code format. Expected format: 12345 or 12345-6789',
      };
    }

    // Query database directly (collection name is "zincodes" as per admin)
    const result = await db.readOne('zincodes', { zipcode });

    if (!result.success) {
      console.error('Database error during zipcode validation:', result.error);
      return {
        isServiceable: false,
        message: 'Unable to verify serviceability. Please try again later.',
      };
    }

    // If zipcode not found in database, it's not serviceable
    if (!result.data) {
      return {
        isServiceable: false,
        message: 'This area is not serviceable. We currently don\'t deliver to this zip code.',
      };
    }

    // Zipcode is serviceable
    return {
      isServiceable: true,
      config: {
        zipcode: result.data.zipcode,
        minCartValue: result.data.minCartValue,
        deliveryFee: result.data.deliveryFee || DEFAULT_DELIVERY_FEE,
      },
    };
  } catch (error) {
    console.error('Server-side zipcode validation error:', error);

    return {
      isServiceable: false,
      message: 'Unable to verify serviceability. Please try again later.',
    };
  }
}


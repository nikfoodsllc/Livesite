/**
 * Client-side zipcode validation utilities
 * These functions are safe to use in client components
 */

export interface ZipcodeValidationResult {
  isServiceable: boolean;
  message?: string;
  config?: {
    zipcode: string;
    minCartValue: number;
    deliveryFee: number;
  };
}

export interface ZipcodeApiResponse {
  success: boolean;
  data?: {
    zipcode: string;
    minCartValue: number;
    deliveryFee: number;
    configured: boolean;
  };
  error?: string;
}

/**
 * Validates if a zip code is serviceable by calling the zipcode-config API
 * This function is safe to use in client components
 *
 * @param zipcode - The zip code to validate
 * @returns Promise with validation result containing serviceability status and configuration
 */
export async function validateZipcodeServiceability(zipcode: string): Promise<ZipcodeValidationResult> {
  try {
    // Basic format validation first
    const zipcodeRegex = /^\d{5}(-\d{4})?$/;
    if (!zipcodeRegex.test(zipcode)) {
      return {
        isServiceable: false,
        message: 'Invalid zip code format. Expected format: 12345 or 12345-6789',
      };
    }

    // Call the zipcode-config API
    const response = await fetch(`/api/zipcode-config?zipcode=${encodeURIComponent(zipcode)}`);

    // Handle error responses from API
    if (!response.ok) {
      // Try to extract error message from response body
      let errorMessage = 'Unable to verify serviceability. Please try again later.';

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        // If we can't parse the error response, use the status text
        console.error('Failed to parse error response:', parseError);
      }

      console.error('Zipcode validation API error:', response.status, response.statusText);

      // Return not serviceable for all error responses (404, 400, 500)
      return {
        isServiceable: false,
        message: errorMessage,
      };
    }

    const data: ZipcodeApiResponse = await response.json();

    if (!data.success || !data.data) {
      return {
        isServiceable: false,
        message: data.error || 'Failed to validate zip code. Please try again.',
      };
    }

    const config = data.data;

    // Check if the zipcode is configured (serviceable)
    if (!config.configured) {
      return {
        isServiceable: false,
        message: 'This area is not serviceable. We currently don\'t deliver to this zip code.',
      };
    }

    // Zipcode is serviceable
    return {
      isServiceable: true,
      config: {
        zipcode: config.zipcode,
        minCartValue: config.minCartValue,
        deliveryFee: config.deliveryFee,
      },
    };
  } catch (error) {
    console.error('Zipcode validation error:', error);

    // Network or other errors - treat as not serviceable
    // Do not allow graceful degradation to defaults
    return {
      isServiceable: false,
      message: 'Unable to verify serviceability. Please check your connection and try again.',
    };
  }
}

/**
 * Validates zip code format only (without checking serviceability)
 *
 * @param zipcode - The zip code to validate
 * @returns True if format is valid, false otherwise
 */
export function validateZipcodeFormat(zipcode: string): boolean {
  const zipcodeRegex = /^\d{5}(-\d{4})?$/;
  return zipcodeRegex.test(zipcode);
}
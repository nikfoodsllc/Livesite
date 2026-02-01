/**
 * Interface for phone validation result
 */
export interface PhoneValidationResult {
  valid: boolean;
  formatted?: string;
  error?: string;
}

/**
 * Validates a US phone number to ensure it is exactly 10 digits.
 * Strips all non-digit characters and validates the cleaned format.
 * Returns formatted phone number in xxx-xxx-xxxx format if valid.
 *
 * @param phone - The phone number string to validate
 * @returns PhoneValidationResult object with validation status, formatted number, and error message
 *
 * @example
 * ```typescript
 * const result1 = validateUSPhone("(555) 123-4567");
 * // Returns: { valid: true, formatted: "555-123-4567" }
 *
 * const result2 = validateUSPhone("555.123.456");
 * // Returns: { valid: false, error: "Phone number must be 10 digits" }
 *
 * const result3 = validateUSPhone("");
 * // Returns: { valid: false, error: "Phone number must be 10 digits" }
 * ```
 */
export function validateUSPhone(phone: string): PhoneValidationResult {
  // Handle null, undefined, or empty input
  if (!phone || phone.trim().length === 0) {
    return {
      valid: false,
      error: 'Phone number must be 10 digits',
    };
  }

  // Remove all non-digit characters
  const cleanedPhone = phone.replace(/\D/g, '');

  // Validate exactly 10 digits
  if (cleanedPhone.length !== 10) {
    return {
      valid: false,
      error: 'Phone number must be 10 digits',
    };
  }

  // Validate all digits (should be exactly 10 digits at this point)
  if (!/^\d{10}$/.test(cleanedPhone)) {
    return {
      valid: false,
      error: 'Phone number must be 10 digits',
    };
  }

  // Format the phone number as xxx-xxx-xxxx
  const formattedPhone = `${cleanedPhone.slice(0, 3)}-${cleanedPhone.slice(3, 6)}-${cleanedPhone.slice(6)}`;

  return {
    valid: true,
    formatted: formattedPhone,
  };
}
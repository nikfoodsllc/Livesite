/**
 * Formats a phone number for display by extracting only the last 10 digits.
 * This removes any international code or prefix, showing only the main number.
 *
 * @param phone - The phone number string (may include international code like +1)
 * @returns The last 10 digits of the phone number, or empty string if invalid
 *
 * Examples:
 *   - "+1234567890" -> "234567890"
 *   - "+1 (234) 567-8901" -> "2345678901"
 *   - "2345678901" -> "2345678901"
 *   - "+12345678901" -> "345678901"
 *   - "" -> ""
 */
export function formatPhoneNumberDisplay(phone: string | undefined | null): string {
  if (!phone) return '';

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Return the last 10 digits, or all digits if less than 10
  return digitsOnly.length > 10
    ? digitsOnly.slice(-10)
    : digitsOnly;
}

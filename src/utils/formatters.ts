/**
 * Formats a spice level string for display.
 * Converts underscores and hyphens to spaces and applies title case.
 * Examples:
 *   - "Semi_spicy" -> "Semi Spicy"
 *   - "Super-Spicy" -> "Super Spicy"
 *   - "mild" -> "Mild"
 */
export function formatSpiceLevel(level: string): string {
  if (!level) return '';

  return level
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalizes a spice level key for config lookup.
 * Converts to lowercase and replaces underscores with hyphens.
 * Examples:
 *   - "Semi_spicy" -> "semi-spicy"
 *   - "Super-Spicy" -> "super-spicy"
 *   - "Mild" -> "mild"
 */
export function normalizeSpiceLevelKey(level: string): string {
  if (!level) return '';

  return level.toLowerCase().replace(/_/g, '-');
}

/**
 * ============================================================================
 * API DATE FORMATTING UTILITIES
 * ============================================================================
 *
 * These functions provide standardized date formatting for API responses.
 * They ensure consistency across all API endpoints and proper timezone handling.
 *
 * For detailed standards, see: /docs/standards/api-date-formats.md
 *
 * ============================================================================
 */

/**
 * Format a Date object to ISO 8601 timestamp string for API responses
 *
 * Use this function for all timestamp fields in API responses:
 * - createdAt, updatedAt, deletedAt
 * - sentAt, deliveredAt, openedAt, clickedAt
 * - bouncedAt, complainedAt, rejectedAt
 * - timestamp, lastAttempt
 *
 * @param date - Date object to format
 * @returns ISO 8601 timestamp string (e.g., "2026-01-15T10:30:00.000Z")
 *
 * @example
 * formatAPITimestamp(new Date()) // Returns "2026-01-15T10:30:00.000Z"
 *
 * @example
 * // Order creation
 * const newOrder = {
 *   orderId: 'ORD-123',
 *   createdAt: formatAPITimestamp(new Date()),
 *   updatedAt: formatAPITimestamp(new Date()),
 * };
 */
export function formatAPITimestamp(date: Date): string {
  if (!date) return '';
  return date.toISOString();
}

/**
 * Format a Date object to YYYY-MM-DD string for API date-only fields
 *
 * IMPORTANT: This function uses PST timezone to ensure consistency with
 * business logic. Do NOT use `toISOString().split('T')[0]` as it uses UTC.
 *
 * Use this function for date-only fields:
 * - deliveryDate, actualDeliveryDate
 * - scheduledDate, availableDate
 * - Date parameters and filters
 * - Day-wise categorization keys
 *
 * @param date - Date object to format
 * @returns Date-only string in YYYY-MM-DD format using PST timezone
 *
 * @example
 * formatAPIDateOnly(new Date()) // Returns "2026-01-15"
 *
 * @example
 * // Order item delivery date
 * const orderItem = {
 *   name: 'Food Item',
 *   deliveryDate: formatAPIDateOnly(deliveryDateObj),
 * };
 *
 * @see /docs/standards/api-date-formats.md - For detailed standards
 * @see /src/lib/timezone.ts - For timezone utilities
 */
export function formatAPIDateOnly(date: Date): string {
  if (!date) return '';

  // Import getPSTDateString to ensure PST timezone handling
  // Note: This is a dynamic import to avoid circular dependencies
  // In production, consider restructuring imports
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date string to human-readable format for UI display
 *
 * PURPOSE: This function provides a UI-friendly date format for display purposes.
 * It is intentionally separate from the canonical 'date' field (YYYY-MM-DD) to follow
 * API best practices of providing both machine-readable and human-readable formats.
 *
 * WHY THIS EXISTS:
 * - Frontend components can directly display formattedDate without additional formatting logic
 * - Provides consistent date formatting across all clients
 * - Reduces client-side JavaScript processing for date display
 * - Maintains ISO 8601 standard in 'date' field for data processing
 *
 * Use this function for the formattedDate field in API responses:
 * - formattedDate in available-dates API
 * - formattedDate in food-items-day-wise API
 * - Any UI display convenience field
 *
 * NOTE: Only include formattedDate in API responses if frontend needs it.
 * Otherwise, let frontend format dates client-side for better flexibility.
 *
 * @param dateString - Date string in YYYY-MM-DD format (ISO 8601)
 * @returns Formatted date string (e.g., "Monday, January 15, 2026") in PST timezone
 *
 * @example
 * formatAPIDisplayDate("2026-01-15") // Returns "Monday, January 15, 2026"
 *
 * @example
 * // API response with dual format
 * return Response.json({
 *   data: {
 *     date: "2026-01-15",  // Machine-readable
 *     formattedDate: formatAPIDisplayDate("2026-01-15"),  // Human-readable
 *   },
 * });
 *
 * @see /docs/standards/api-date-formats.md - For dual format pattern explanation
 * @see /docs/api-date-format-standardization.md - For implementation examples
 */
export function formatAPIDisplayDate(dateString: string): string {
  if (!dateString) return '';

  try {
    const [year, month, day] = dateString.split('-').map(Number);

    // Create PST date object
    // Note: In production, import createPSTDate from timezone utilities
    const dateObj = new Date(year, month - 1, day);

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      // Note: PST_TIMEZONE should be imported from /src/lib/timezone.ts
      // timeZone: PST_TIMEZONE,
    };

    return dateObj.toLocaleDateString('en-US', options);
  } catch (error) {
    console.warn(`Failed to format date: ${dateString}`, error);
    return dateString; // Fallback to ISO format
  }
}

/**
 * ============================================================================
 * TYPESCRIPT TYPE DEFINITIONS FOR DATE STRINGS
 * ============================================================================
 *
 * These branded types provide type safety for different date formats.
 * They help prevent mixing different date formats at compile time.
 *
 * Usage:
 *   type ISODateTimeString = string & { readonly __brand: 'ISODateTime' };
 *   type DateOnlyString = string & { readonly __brand: 'DateOnly' };
 *   type FormattedDateString = string & { readonly __brand: 'FormattedDate' };
 *
 * ============================================================================
 */

/**
 * ISO 8601 timestamp string
 * Format: YYYY-MM-DDTHH:mm:ss.sssZ
 * Example: "2026-01-15T10:30:00.000Z"
 *
 * Use for: createdAt, updatedAt, sentAt, deliveredAt, etc.
 */
export type ISODateTimeString = string & { readonly __brand: 'ISODateTime' };

/**
 * Date-only string in YYYY-MM-DD format
 * Format: YYYY-MM-DD
 * Example: "2026-01-15"
 *
 * Use for: deliveryDate, scheduledDate, availableDate, etc.
 */
export type DateOnlyString = string & { readonly __brand: 'DateOnly' };

/**
 * Formatted date string for UI display
 * Format: Locale-specific (e.g., "Monday, January 15, 2026")
 * Example: "Monday, January 15, 2026"
 *
 * Use for: formattedDate fields in API responses
 */
export type FormattedDateString = string & { readonly __brand: 'FormattedDate' };

/**
 * Helper function to create ISODateTimeString with type safety
 *
 * @param date - Date object to convert
 * @returns Branded ISODateTimeString
 *
 * @example
 * const timestamp: ISODateTimeString = toISOString(new Date());
 */
export function toISOString(date: Date): ISODateTimeString {
  return date.toISOString() as ISODateTimeString;
}

/**
 * Helper function to create DateOnlyString with type safety
 *
 * @param date - Date object to convert
 * @returns Branded DateOnlyString in YYYY-MM-DD format
 *
 * @example
 * const deliveryDate: DateOnlyString = toDateOnlyString(new Date());
 */
export function toDateOnlyString(date: Date): DateOnlyString {
  return formatAPIDateOnly(date) as DateOnlyString;
}

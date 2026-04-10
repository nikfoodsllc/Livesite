/**
 * ============================================================================
 * API DATE FORMATTING UTILITIES
 * ============================================================================
 *
 * PURPOSE:
 * --------
 * This module provides centralized, consistent date formatting functions for
 * all API responses. It ensures uniform date representation across all API
 * endpoints and maintains consistency with the application's timezone handling.
 *
 * DESIGN PRINCIPLES:
 * ------------------
 * 1. ISO 8601 Format: All Date objects with time (timestamps) are formatted
 *    in ISO 8601 format (e.g., '2026-01-15T10:30:00.000Z')
 *
 * 2. Date-Only Format: Calendar dates without time use YYYY-MM-DD format
 *    (e.g., '2026-01-15')
 *
 * 3. Timezone Consistency: All formatting respects the PST_TIMEZONE setting
 *    from /src/lib/timezone.ts for business logic dates
 *
 * 4. Type Safety: Full TypeScript support with input validation
 *
 * 5. Edge Case Handling: Graceful handling of null, undefined, and invalid dates
 *
 * USAGE EXAMPLES:
 * ---------------
 *
 * // Format a timestamp for API response
 * import { formatAPIDate, formatAPITimestamp } from '@/lib/apiDateFormat';
 *
 * response.createdAt = formatAPIDate(order.createdAt);
 * // Returns: '2026-01-15T10:30:00.000Z'
 *
 * // Format a date-only calendar date
 * import { formatAPIDateOnly } from '@/lib/apiDateFormat';
 *
 * response.deliveryDate = formatAPIDateOnly(order.deliveryDate);
 * // Returns: '2026-01-15'
 *
 * // Format with millisecond precision
 * response.timestamp = formatAPITimestamp(new Date());
 * // Returns: '2026-01-15T10:30:45.123Z'
 *
 * ============================================================================
 */

import { PST_TIMEZONE } from './timezone';

/**
 * Format a Date object or date string to ISO 8601 format for API responses
 *
 * This is the standard formatter for timestamps in API responses. Use this for:
 * - createdAt timestamps
 * - updatedAt timestamps
 * - Any datetime fields that include time information
 *
 * @param date - Date object, date string, or null/undefined
 * @returns ISO 8601 formatted string (YYYY-MM-DDTHH:mm:ss.sssZ) or empty string for invalid input
 *
 * @example
 * formatAPIDate(new Date('2026-01-15T10:30:00Z'))
 * // Returns: '2026-01-15T10:30:00.000Z'
 *
 * @example
 * formatAPIDate('2026-01-15T10:30:00Z')
 * // Returns: '2026-01-15T10:30:00.000Z'
 *
 * @example
 * formatAPIDate(null)
 * // Returns: ''
 *
 * @example
 * formatAPIDate(undefined)
 * // Returns: ''
 *
 * @example
 * // Usage in API response
 * return Response.json({
 *   success: true,
 *   data: {
 *     orderId: order.orderId,
 *     createdAt: formatAPIDate(order.createdAt),
 *     updatedAt: formatAPIDate(order.updatedAt)
 *   }
 * });
 */
export function formatAPIDate(date: Date | string | null | undefined): string {
  // Handle null/undefined inputs
  if (date === null || date === undefined) {
    return '';
  }

  try {
    // Convert to Date object if string
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Validate date
    if (isNaN(dateObj.getTime())) {
      console.warn('[formatAPIDate] Invalid date provided:', date);
      return '';
    }

    // Return ISO 8601 format with milliseconds
    return dateObj.toISOString();
  } catch (error) {
    console.error('[formatAPIDate] Error formatting date:', error, 'Input:', date);
    return '';
  }
}

/**
 * Format a date-only calendar date to YYYY-MM-DD format
 *
 * Use this for calendar dates that don't include time information:
 * - Delivery dates
 * - Available dates
 * - Schedule dates
 * - Any date-only fields in business logic
 *
 * This function uses the configured PST timezone to ensure consistent date
 * representation regardless of server timezone configuration.
 *
 * @param dateString - Date string in YYYY-MM-DD format or Date object, or null/undefined
 * @returns Date string in YYYY-MM-DD format or empty string for invalid input
 *
 * @example
 * formatAPIDateOnly('2026-01-15')
 * // Returns: '2026-01-15'
 *
 * @example
 * formatAPIDateOnly(new Date('2026-01-15T10:30:00Z'))
 * // Returns: '2026-01-15' (date in PST timezone)
 *
 * @example
 * formatAPIDateOnly(null)
 * // Returns: ''
 *
 * @example
 * // Usage in API response for delivery date
 * return Response.json({
 *   success: true,
 *   data: {
 *     orderId: order.orderId,
 *     deliveryDate: formatAPIDateOnly(order.deliveryDate)
 *   }
 * });
 */
export function formatAPIDateOnly(dateString: string | Date | null | undefined): string {
  // Handle null/undefined inputs
  if (dateString === null || dateString === undefined) {
    return '';
  }

  try {
    let dateObj: Date;

    // Convert to Date object if string
    if (typeof dateString === 'string') {
      // If already in YYYY-MM-DD format, return as-is (after validation)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const parts = dateString.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);

        // Basic validation
        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return dateString;
        }
      }
      dateObj = new Date(dateString);
    } else {
      dateObj = dateString;
    }

    // Validate date
    if (isNaN(dateObj.getTime())) {
      console.warn('[formatAPIDateOnly] Invalid date provided:', dateString);
      return '';
    }

    // Format date in PST timezone to YYYY-MM-DD
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: PST_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(dateObj);
    const year = parts.find((p) => p.type === 'year')?.value || '';
    const month = parts.find((p) => p.type === 'month')?.value || '';
    const day = parts.find((p) => p.type === 'day')?.value || '';

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('[formatAPIDateOnly] Error formatting date:', error, 'Input:', dateString);
    return '';
  }
}

/**
 * Format a Date object to ISO 8601 format with explicit millisecond precision
 *
 * This is identical to formatAPIDate() but with explicit documentation that
 * milliseconds are included. Use this when you need to emphasize millisecond
 * precision in timestamps (e.g., for sorting, precise timing calculations).
 *
 * @param date - Date object or null/undefined
 * @returns ISO 8601 formatted string with milliseconds (YYYY-MM-DDTHH:mm:ss.sssZ)
 *          or empty string for invalid input
 *
 * @example
 * formatAPITimestamp(new Date('2026-01-15T10:30:45.123Z'))
 * // Returns: '2026-01-15T10:30:45.123Z'
 *
 * @example
 * formatAPITimestamp(null)
 * // Returns: ''
 *
 * @example
 * // Usage in API response for precise timestamps
 * return Response.json({
 *   success: true,
 *   data: {
 *     events: events.map(event => ({
 *       id: event.id,
 *       timestamp: formatAPITimestamp(event.timestamp),
 *       type: event.type
 *     }))
 *   }
 * });
 */
export function formatAPITimestamp(date: Date | null | undefined): string {
  // Handle null/undefined inputs
  if (date === null || date === undefined) {
    return '';
  }

  try {
    // Validate date
    if (isNaN(date.getTime())) {
      console.warn('[formatAPITimestamp] Invalid date provided:', date);
      return '';
    }

    // Return ISO 8601 format with milliseconds
    return date.toISOString();
  } catch (error) {
    console.error('[formatAPITimestamp] Error formatting timestamp:', error, 'Input:', date);
    return '';
  }
}

/**
 * Validate if a string or Date object represents a valid date
 *
 * Helper function to check if a date input is valid before formatting.
 *
 * @param date - Date object, date string, or null/undefined
 * @returns true if the input is a valid date, false otherwise
 *
 * @example
 * isValidAPIDate(new Date('2026-01-15'))
 * // Returns: true
 *
 * @example
 * isValidAPIDate('invalid-date')
 * // Returns: false
 *
 * @example
 * isValidAPIDate(null)
 * // Returns: false
 */
export function isValidAPIDate(date: Date | string | null | undefined): boolean {
  if (date === null || date === undefined) {
    return false;
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return !isNaN(dateObj.getTime());
  } catch {
    return false;
  }
}

/**
 * Format an array of dates using the specified formatter function
 *
 * Helper function to format arrays of dates consistently.
 *
 * @param dates - Array of Date objects, date strings, or null/undefined values
 * @param formatter - The formatter function to use (formatAPIDate or formatAPIDateOnly)
 * @returns Array of formatted date strings
 *
 * @example
 * const dates = [new Date('2026-01-15'), new Date('2026-01-16')];
 * formatAPIDateArray(dates, formatAPIDate)
 * // Returns: ['2026-01-15T00:00:00.000Z', '2026-01-16T00:00:00.000Z']
 *
 * @example
 * const dateStrings = ['2026-01-15', '2026-01-16'];
 * formatAPIDateArray(dateStrings, formatAPIDateOnly)
 * // Returns: ['2026-01-15', '2026-01-16']
 */
export function formatAPIDateArray(
  dates: Array<Date | string | null | undefined>,
  formatter: (date: Date | string | null | undefined) => string
): string[] {
  return dates.map(date => formatter(date));
}

/**
 * ============================================================================
 * USAGE GUIDE: CHOOSING THE RIGHT FORMATTER
 * ============================================================================
 *
 * WHEN TO USE formatAPIDate():
 * ----------------------------
 * Use for Date objects with time information:
 * - createdAt timestamps
 * - updatedAt timestamps
 * - sentAt, deliveredAt, openedAt timestamps (email analytics)
 * - Any datetime fields that include time
 *
 * Output format: '2026-01-15T10:30:00.000Z' (ISO 8601 with milliseconds)
 *
 * Example:
 *   response.createdAt = formatAPIDate(order.createdAt);
 *
 * WHEN TO USE formatAPIDateOnly():
 * ---------------------------------
 * Use for date-only calendar dates:
 * - Delivery dates
 * - Available dates in the calendar
 * - Schedule dates
 * - Any date-only fields without time
 *
 * Output format: '2026-01-15' (YYYY-MM-DD)
 *
 * Example:
 *   response.deliveryDate = formatAPIDateOnly(order.deliveryDate);
 *
 * WHEN TO USE formatAPITimestamp():
 * ----------------------------------
 * Use when you need to emphasize millisecond precision:
 * - Event timestamps for precise ordering
 * - Performance timing measurements
 * - Audit logs requiring high precision
 *
 * Output format: '2026-01-15T10:30:45.123Z' (ISO 8601 with milliseconds)
 *
 * Example:
 *   response.timestamp = formatAPITimestamp(event.timestamp);
 *
 * WHEN TO USE Helper Functions:
 * ------------------------------
 * - isValidAPIDate(): Validate date inputs before formatting
 * - formatAPIDateArray(): Format arrays of dates consistently
 *
 * ============================================================================
 * MIGRATION GUIDE
 * ============================================================================
 *
 * OLD PATTERN (inconsistent):
 * ---------------------------
 * ❌ return order.createdAt.toISOString(); // No error handling
 * ❌ return order.deliveryDate as string; // Type casting, no formatting
 * ❌ return new Date(dateStr).toISOString(); // No validation
 *
 * NEW PATTERN (consistent):
 * -------------------------
 * ✅ return formatAPIDate(order.createdAt); // With validation and error handling
 * ✅ return formatAPIDateOnly(order.deliveryDate); // Proper date-only formatting
 * ✅ return formatAPITimestamp(event.timestamp); // Explicit millisecond precision
 *
 * ============================================================================
 */

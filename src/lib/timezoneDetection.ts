/**
 * ============================================================================
 * TIMEZONE DETECTION UTILITY
 * ============================================================================
 *
 * This utility provides client-side timezone detection and offset calculation
 * to warn users when their local timezone differs significantly from PST.
 *
 * PURPOSE:
 * --------
 * The application displays all dates and times in Pacific Time (PST/PDT).
 * Users in timezones significantly different from PST may misinterpret
 * delivery dates and cutoff times. This utility detects such users and
 * shows a warning banner to clarify the timezone difference.
 *
 * WARNING THRESHOLD:
 * ------------------
 * Users with an offset greater than 2 hours from PST will see a warning.
 * This threshold balances user awareness with avoiding unnecessary warnings
 * for users in Mountain Time (MT) or similar nearby timezones.
 *
 * EDGE CASES HANDLED:
 * -------------------
 * - Invalid or undetectable timezones: Returns null, no warning shown
 * - Users exactly at 2 hours offset: No warning shown (threshold is > 2, not >= 2)
 * - SSR/hydration: All functions are client-side safe
 * - localStorage unavailable: Gracefully handled without errors
 *
 * ============================================================================
 */

import { PST_TIMEZONE } from './timezone';

const LOCAL_STORAGE_KEY = 'timezone-warning-dismissed';
const WARNING_THRESHOLD_HOURS = 2;

/**
 * Get the user's local IANA timezone identifier
 * Uses Intl.DateTimeFormat API to detect the browser's timezone setting
 *
 * @returns User's IANA timezone identifier (e.g., 'America/New_York', 'Asia/Kolkata')
 *          Returns null if timezone cannot be detected
 * @example
 * const userTimezone = getUserTimezone();
 * // Returns: 'America/New_York' for a user in Eastern Time
 */
export function getUserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    // Intl API may not be available in all environments
    console.warn('Unable to detect user timezone:', error);
    return null;
  }
}

/**
 * Calculate the offset in hours between user's timezone and PST
 * Uses the current date/time to account for daylight saving time differences
 *
 * @returns Offset in hours (positive = user is ahead of PST, negative = user is behind PST)
 *          Returns null if timezone detection fails
 * @example
 * // User in New York (EST, UTC-5) vs PST (UTC-8)
 * const offset = getTimezoneOffsetFromPST(); // Returns: 3 (EST is 3 hours ahead of PST)
 *
 * // User in Tokyo (JST, UTC+9) vs PST (UTC-8)
 * const offset = getTimezoneOffsetFromPST(); // Returns: 17 (JST is 17 hours ahead of PST)
 */
export function getTimezoneOffsetFromPST(): number | null {
  const userTimezone = getUserTimezone();

  if (!userTimezone) {
    return null;
  }

  try {
    const now = new Date();

    // Get the offset in milliseconds for both timezones
    const userOffset = getTimezoneOffset(now, userTimezone);
    const pstOffset = getTimezoneOffset(now, PST_TIMEZONE);

    // Calculate the difference in hours
    const offsetMs = userOffset - pstOffset;
    const offsetHours = offsetMs / (1000 * 60 * 60);

    // Round to 1 decimal place for cleaner display
    return Math.round(offsetHours * 10) / 10;
  } catch (error) {
    console.warn('Unable to calculate timezone offset:', error);
    return null;
  }
}

/**
 * Helper function to get timezone offset in milliseconds for a given date and timezone
 * Uses Intl.DateTimeFormat to get the time zone offset, accounting for DST
 *
 * @param date - The date to calculate offset for
 * @param timezone - IANA timezone identifier
 * @returns Offset in milliseconds from UTC
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0', 10);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

  // Create a date object in the target timezone
  const localDate = new Date(year, month, day, hour, minute, second);

  // Calculate offset from UTC
  return localDate.getTime() - date.getTime();
}

/**
 * Determine if the timezone warning should be shown to the user
 * Warning is shown if:
 * 1. Offset from PST is greater than WARNING_THRESHOLD_HOURS (default: 2 hours)
 * 2. User hasn't previously dismissed the warning
 *
 * @returns true if warning should be shown, false otherwise
 * @example
 * if (shouldShowTimezoneWarning()) {
 *   // Show TimezoneWarningBanner component
 * }
 */
export function shouldShowTimezoneWarning(): boolean {
  // Check if user has previously dismissed the warning
  if (isWarningDismissed()) {
    return false;
  }

  // Check if timezone offset exceeds threshold
  const offset = getTimezoneOffsetFromPST();

  if (offset === null) {
    return false;
  }

  // Use absolute value to check if offset is more than threshold hours away
  // Threshold is > 2, not >= 2, so exactly 2 hours offset won't trigger warning
  return Math.abs(offset) > WARNING_THRESHOLD_HOURS;
}

/**
 * Check if the user has previously dismissed the timezone warning
 *
 * @returns true if warning was dismissed, false otherwise
 */
export function isWarningDismissed(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    return localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
  } catch (error) {
    // localStorage may be unavailable (e.g., in incognito mode with certain settings)
    console.warn('Unable to access localStorage:', error);
    return false;
  }
}

/**
 * Mark the timezone warning as dismissed
 * Stores dismissal state in localStorage to prevent repeated warnings
 *
 * @example
 * handleDismiss(); // Call when user clicks the X button on the banner
 */
export function dismissWarning(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
  } catch (error) {
    console.warn('Unable to save dismissal state:', error);
  }
}

/**
 * Reset the dismissal state (useful for testing or if you want to re-show the warning)
 *
 * @example
 * resetWarningDismissal(); // Warning will be shown again on next page load
 */
export function resetWarningDismissal(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to reset dismissal state:', error);
  }
}

/**
 * Get a human-readable description of the timezone offset
 * Useful for displaying the offset in the warning message
 *
 * @returns String describing the offset (e.g., "3 hours ahead", "5.5 hours behind")
 *          Returns null if offset cannot be calculated
 * @example
 * const offsetDescription = getTimezoneOffsetDescription();
 * // Returns: "3 hours ahead" for a user in EST (UTC-5) vs PST (UTC-8)
 */
export function getTimezoneOffsetDescription(): string | null {
  const offset = getTimezoneOffsetFromPST();

  if (offset === null) {
    return null;
  }

  const absoluteOffset = Math.abs(offset);
  const direction = offset > 0 ? 'ahead' : 'behind';

  // Handle pluralization
  const hours = absoluteOffset === 1 ? 'hour' : 'hours';

  return `${absoluteOffset} ${hours} ${direction}`;
}

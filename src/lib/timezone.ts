/**
 * ============================================================================
 * TIMEZONE CONFIGURATION AND APPROACH
 * ============================================================================
 *
 * WHY PACIFIC TIME (PST/PDT)?
 * ----------------------------
 * This application uses Pacific Time (America/Los_Angeles) as its canonical
 * timezone for all business operations. This timezone choice is critical for:
 *
 * 1. ORDER CUTOFF TIMES: All same-day order cutoffs occur at 1 PM Pacific Time.
 *    This ensures consistent order processing regardless of customer location.
 *
 * 2. AVAILABILITY LOGIC: Day availability is determined using Pacific Time dates.
 *    A "day" is considered available until 1 PM PST the DAY BEFORE.
 *    Example: Friday orders close at 1 PM PST on Thursday.
 *
 * 3. OPERATIONAL CONSISTENCY: Using a single timezone avoids confusion around
 *    day boundaries, daylight saving transitions, and customer locations.
 *
 * USER TIMEZONE WARNING
 * ---------------------
 * Users in timezones significantly different from PST (more than 2 hours offset)
 * will see a dismissible warning banner explaining that all dates and times are
 * displayed in Pacific Time. This helps prevent confusion about delivery dates
 * and cutoff times.
 *
 * Implementation: See src/lib/timezoneDetection.ts for the client-side timezone
 * detection logic and src/components/common/TimezoneWarningBanner.tsx for the
 * warning banner component.
 *
 * The warning:
 * - Only shows for users with >2 hours offset from PST
 * - Can be dismissed and is remembered via localStorage
 * - Provides clear, informative messaging about timezone differences
 * - Does not block any user actions
 *
 * CONFIGURATION
 * -------------
 * The timezone is configured via the NEXT_PUBLIC_TIMEZONE environment variable.
 * Default: 'America/Los_Angeles' (Pacific Time)
 *
 * To change the application timezone:
 * 1. Update NEXT_PUBLIC_TIMEZONE in .env.local (development) or production environment
 * 2. Ensure the IANA timezone identifier is valid (e.g., 'America/New_York', 'Europe/London')
 * 3. Test all order cutoff and availability logic after changing
 *
 * DAYLIGHT SAVING TIME
 * --------------------
 * The IANA timezone identifier (America/Los_Angeles) automatically handles
 * daylight saving transitions. PST (UTC-8) converts to PDT (UTC-7) on the
 * second Sunday of March at 2:00 AM local time and reverts on the first
 * Sunday of November at 2:00 AM local time.
 *
 * All date operations in this module are timezone-aware and will correctly
 * account for DST transitions without additional code.
 *
 * IMPORTANT NOTES
 * ---------------
 * - Always use functions from this module for date operations to ensure
 *   consistent timezone handling across the application
 * - Never rely on server time or user local time for business logic
 * - When comparing dates, use the provided comparison functions rather than
 *   direct Date object comparisons
 * - The "day-before cutoff" rule means Friday orders close Thursday at 1 PM PST
 *
 * ============================================================================
 */

/**
 * Application timezone identifier
 * Reads from NEXT_PUBLIC_TIMEZONE environment variable with fallback to Pacific Time
 *
 * @constant {string}
 * @default 'America/Los_Angeles'
 */
export const PST_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Los_Angeles';

/**
 * Get current time in the configured timezone (default: Pacific Time)
 *
 * @returns Current Date adjusted to the application timezone
 * @example
 * const now = getPSTNow();
 * // Returns current time in Pacific Time (or configured timezone)
 */
export function getPSTNow(): Date {
  const now = new Date();
  return toPSTDate(now);
}

/**
 * Convert any Date object to the configured timezone for display purposes
 * Returns a new Date object representing the same moment in time
 *
 * NOTE: JavaScript Date objects are always stored in UTC internally.
 * This function returns a Date object that can be used with timezone-aware
 * formatting functions to display the correct time in the application timezone.
 *
 * @param date - The date to convert
 * @returns Date object representing the same moment in time, suitable for timezone-aware operations
 * @example
 * const utcDate = new Date('2024-01-15T20:00:00Z');
 * const pstDate = toPSTDate(utcDate);
 * // Use with formatPSTDate() to display in Pacific Time
 */
export function toPSTDate(date: Date): Date {
  return new Date(date);
}

/**
 * Get current hour in the configured timezone (0-23)
 * Used for cutoff time comparisons and time-based logic
 *
 * @param date - Optional date to check (defaults to current time)
 * @returns Hour in the application timezone (0-23)
 * @example
 * const hour = getPSTHour();
 * // Returns 13 for 1 PM Pacific Time
 * // Used to check if past cutoff: isAfterOrEqualPSTHour(13)
 *
 * @example
 * // Cutoff time implementation in src/lib/server/availableDates.ts
 * // Check if current time is past 1 PM PST (13:00) for order cutoff
 * const currentHour = getPSTHour();
 * const isPastCutoff = currentHour >= 13; // Past 1 PM PST
 */
export function getPSTHour(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PST_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  });

  const hour = parseInt(formatter.format(date), 10);
  return hour;
}

/**
 * Get current hour, minute, and second in the configured timezone
 * Provides detailed time components for precise cutoff calculations
 *
 * @param date - Optional date to check (defaults to current time)
 * @returns Object with hour, minute, and second in the application timezone
 * @example
 * const { hour, minute, second } = getPSTTimeComponents();
 * // Returns: { hour: 13, minute: 30, second: 45 } for 1:30:45 PM PST
 * // Used for calculating time until cutoff
 */
export function getPSTTimeComponents(date: Date = new Date()): {
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PST_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

  return { hour, minute, second };
}

/**
 * Check if a given date is in the past relative to the configured timezone
 * Compares dates at midnight in the application timezone to determine if one day is before another
 *
 * @param targetDate - The date to check
 * @param currentDate - Optional current date for comparison (defaults to now in application timezone)
 * @returns true if targetDate is strictly before currentDate (at midnight resolution)
 * @example
 * const yesterday = new Date('2024-01-14');
 * const today = new Date('2024-01-15');
 * isInPSTPast(yesterday, today); // Returns true
 */
export function isInPSTPast(targetDate: Date, currentDate: Date = getPSTNow()): boolean {
  const targetMidnight = getPSTMidnight(targetDate);
  const currentMidnight = getPSTMidnight(currentDate);
  return targetMidnight.getTime() < currentMidnight.getTime();
}

/**
 * Check if a given date is today in the configured timezone
 *
 * @param targetDate - The date to check
 * @param currentDate - Optional current date for comparison (defaults to now in application timezone)
 * @returns true if targetDate is the same day as currentDate in the application timezone
 * @example
 * const today = new Date();
 * isPSTToday(today); // Returns true
 */
export function isPSTToday(targetDate: Date, currentDate: Date = getPSTNow()): boolean {
  const targetMidnight = getPSTMidnight(targetDate);
  const currentMidnight = getPSTMidnight(currentDate);
  return targetMidnight.getTime() === currentMidnight.getTime();
}

/**
 * Get midnight (start of day) for a given date in PST timezone
 * Returns a Date object set to 00:00:00.000 in PST
 *
 * @param date - The date to get midnight for
 * @returns Date object set to midnight PST
 * @example
 * const midnight = getPSTMidnight(new Date());
 * // Returns midnight of current day in PST
 *
 * @example
 * // Cutoff time implementation in src/lib/server/availableDates.ts
 * // Get today's midnight and tomorrow's midnight for cutoff logic
 * const now = getPSTNow();
 * const todayMidnight = getPSTMidnight(now);
 * const tomorrowMidnight = addPSTDays(todayMidnight, 1);
 * // Use these to determine if a target date is "tomorrow"
 */
export function getPSTMidnight(date: Date): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PST_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0', 10);

  const midnight = new Date(year, month, day, 0, 0, 0, 0);
  return midnight;
}

/**
 * Create a PST-aware Date object from date components
 * Creates a Date object representing the given time in PST timezone (America/Los_Angeles)
 *
 * IMPORTANT: The returned Date object uses local time representation but should be
 * used with timezone-aware formatting functions (formatPSTDate, etc.) to ensure
 * correct PST display regardless of server timezone.
 *
 * @param year - Full year (e.g., 2024)
 * @param month - Month (0-11, where 0 = January)
 * @param day - Day of month (1-31)
 * @param hour - Hour (0-23, defaults to 0)
 * @param minute - Minute (0-59, defaults to 0)
 * @param second - Second (0-59, defaults to 0)
 * @returns Date object representing the specified time in PST timezone
 * @example
 * const date = createPSTDate(2024, 0, 15, 13, 0, 0);
 * // Creates: January 15, 2024, 1:00 PM PST
 * formatPSTDate(date, 'short'); // "01/15/2024"
 */
export function createPSTDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  // Create date string in ISO format with timezone indicator
  // This ensures the date is created in the specified timezone
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

  // Parse as local time (not UTC) since the input is intended to be in PST timezone
  // The caller provides year/month/day values that are already in PST context
  return new Date(dateStr);
}

/**
 * Format a date in PST timezone for display
 * Provides various formatting options for displaying dates
 *
 * @param date - The date to format
 * @param format - Format style: 'short' (MM/DD/YYYY), 'long' (January 1, 2024),
 *                 'weekday' (Tuesday, January 1), or 'time' (1:30 PM)
 * @returns Formatted date string in PST timezone
 */
export function formatPSTDate(
  date: Date,
  format: 'short' | 'long' | 'weekday' | 'time' = 'short'
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: PST_TIMEZONE,
  };

  switch (format) {
    case 'short':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'long':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      break;
    case 'weekday':
      options.weekday = 'long';
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      break;
    case 'time':
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
      break;
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Get the day of week name for a date
 *
 * @param date - The date to get the weekday for
 * @returns Full weekday name (e.g., "Monday", "Tuesday")
 */
export function getPSTWeekday(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: PST_TIMEZONE,
  });

  return formatter.format(date);
}

/**
 * Get the day of week number for a date in PST timezone
 *
 * Uses Intl.DateTimeFormat with explicit timeZone parameter to ensure
 * the weekday is calculated in Pacific Time, not the system timezone.
 * This is critical for dates near midnight where the system timezone
 * may differ from PST.
 *
 * @param date - The date to get the weekday number for
 * @returns Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @example
 * const date = new Date('2024-01-15T20:00:00Z'); // 8 PM UTC
 * getPSTWeekdayNumber(date); // Returns 1 (Monday) in PST timezone
 */
export function getPSTWeekdayNumber(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: PST_TIMEZONE,
  });
  const weekdayName = formatter.format(date);
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdayNames.indexOf(weekdayName);
}

/**
 * Check if current time in PST is before a specific hour
 * Useful for cutoff time checks
 *
 * @param hour - Hour to check against (0-23)
 * @param date - Optional date to check (defaults to now)
 * @returns true if current PST time is before the specified hour
 */
export function isBeforePSTHour(hour: number, date: Date = getPSTNow()): boolean {
  const currentHour = getPSTHour(date);
  return currentHour < hour;
}

/**
 * Check if current time in PST is after or equal to a specific hour
 * Useful for cutoff time checks
 *
 * @param hour - Hour to check against (0-23)
 * @param date - Optional date to check (defaults to now)
 * @returns true if current PST time is after or equal to the specified hour
 * @example
 * // Check if it's past 1 PM PST (13:00)
 * if (isAfterOrEqualPSTHour(13)) {
 *   // Past cutoff time - disable tomorrow's date
 * }
 *
 * @example
 * // Cutoff time implementation in src/lib/server/availableDates.ts
 * // Business rule: Orders close at 1 PM PST the day before delivery
 * // Example: Friday orders close at 1 PM PST on Thursday
 * const CUTOFF_HOUR = 13; // 1 PM PST
 * const isPastCutoff = isAfterOrEqualPSTHour(CUTOFF_HOUR);
 * // If true, tomorrow's delivery date is no longer available
 */
export function isAfterOrEqualPSTHour(hour: number, date: Date = getPSTNow()): boolean {
  const currentHour = getPSTHour(date);
  return currentHour >= hour;
}

/**
 * Add days to a date in PST timezone
 *
 * @param date - The base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added in PST timezone
 * @example
 * const tomorrow = addPSTDays(new Date(), 1);
 * // Returns same time tomorrow in PST
 *
 * @example
 * // Cutoff time implementation in src/lib/server/availableDates.ts
 * // Calculate tomorrow's midnight to determine if a date is "tomorrow"
 * const now = getPSTNow();
 * const todayMidnight = getPSTMidnight(now);
 * const tomorrowMidnight = addPSTDays(todayMidnight, 1);
 * // Compare target date's midnight with tomorrowMidnight to check if it's tomorrow
 *
 * IMPLEMENTATION NOTE:
 * This function uses UTC millisecond arithmetic to add days, which is timezone-safe.
 * It adds exact 24-hour periods (days * 24 * 60 * 60 * 1000 milliseconds) to the
 * timestamp, ensuring consistent behavior across DST boundaries and system timezones.
 */
export function addPSTDays(date: Date, days: number): Date {
  const daysToAdd = days * 24 * 60 * 60 * 1000;
  const newTimestamp = date.getTime() + daysToAdd;
  return new Date(newTimestamp);
}

/**
 * Calculate the difference in days between two dates in PST timezone
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days difference (date2 - date1)
 */
export function getPSTDayDifference(date1: Date, date2: Date): number {
  const midnight1 = getPSTMidnight(date1);
  const midnight2 = getPSTMidnight(date2);
  const diffMs = midnight2.getTime() - midnight1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get a PST-aware date string in YYYY-MM-DD format
 *
 * This function generates a date string using Pacific Time timezone, ensuring
 * consistent date representation regardless of server timezone configuration.
 * It replaces the pattern `.toISOString().split('T')[0]` which generates UTC-based
 * date strings instead of PST-based date strings.
 *
 * CRITICAL: Use this function instead of `.toISOString().split('T')[0]` when you
 * need the date in Pacific Time. The ISO approach uses UTC, which can cause
 * off-by-one errors when UTC and PST are on different calendar days.
 *
 * @param date - Optional date to convert (defaults to current time in PST)
 * @returns Date string in format YYYY-MM-DD using Pacific Time timezone
 * @example
 * // Get today's date in PST
 * const today = getPSTDateString();
 * // Returns: "2024-01-15" (assuming it's Jan 15 in Pacific Time)
 *
 * @example
 * // Convert a specific date to PST date string
 * const utcDate = new Date('2024-01-16T02:00:00Z'); // 6 PM PST on Jan 15
 * const pstDateString = getPSTDateString(utcDate);
 * // Returns: "2024-01-15" (date in Pacific Time, not UTC)
 *
 * @example
 * // Compare with incorrect UTC-based approach
 * const wrongWay = date.toISOString().split('T')[0]; // Uses UTC - WRONG!
 * const correctWay = getPSTDateString(date); // Uses PST - CORRECT!
 *
 * @example
 * // Usage in database queries
 * const startDate = getPSTDateString(); // Today in PST
 * const results = await db.read('availableDates', {
 *   date: { $gte: startDate }
 * });
 */
export function getPSTDateString(date: Date = getPSTNow()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
}

/**
 * ============================================================================
 * MIGRATION GUIDE: DATE STRING GENERATION
 * ============================================================================
 *
 * OLD PATTERN (INCORRECT - uses UTC):
 * ------------------------------------
 * // ❌ WRONG - generates date string in UTC timezone
 * const dateStr = date.toISOString().split('T')[0];
 *
 * Example of off-by-one error:
 * const date = new Date('2024-01-15T20:00:00Z'); // 8 PM UTC = 12 PM PST
 * date.toISOString().split('T')[0]; // Returns: "2024-01-15" (UTC date)
 * // But in PST, it's still Jan 15, 2024 at 12 PM
 * // If this were 2024-01-16T02:00:00Z (6 PM PST on Jan 15):
 * date.toISOString().split('T')[0]; // Returns: "2024-01-16" (WRONG DAY for PST!)
 *
 * NEW PATTERN (CORRECT - uses PST):
 * ---------------------------------
 * // ✅ CORRECT - generates date string in PST timezone
 * const dateStr = getPSTDateString(date);
 *
 * Example with correct PST handling:
 * const date = new Date('2024-01-16T02:00:00Z'); // 6 PM PST on Jan 15
 * getPSTDateString(date); // Returns: "2024-01-15" (PST date - CORRECT!)
 *
 * ============================================================================
 * MIGRATION GUIDE: CHOOSING THE RIGHT FUNCTION
 * ============================================================================
 *
 * When you need a DATE STRING (YYYY-MM-DD):
 * ------------------------------------------
 * Use: getPSTDateString(date)
 * Returns: "2024-01-15"
 * Use case: Database queries, API responses, date comparisons
 * Example:
 *   const today = getPSTDateString();
 *   await db.read('orders', { date: today });
 *
 * When you need a FORMATTED DATE FOR DISPLAY:
 * --------------------------------------------
 * Use: formatPSTDate(date, formatType)
 * Returns: "01/15/2024", "January 15, 2024", etc.
 * Use case: UI display, user-facing text
 * Example:
 *   const displayDate = formatPSTDate(date, 'long');
 *   // Returns: "January 15, 2024"
 *
 * When you need to CHECK if a date is TODAY/PAST:
 * ------------------------------------------------
 * Use: isPSTToday(date) or isInPSTPast(date)
 * Returns: boolean
 * Use case: Business logic, availability checks
 * Example:
 *   if (isInPSTPast(deliveryDate)) {
 *     // Handle past delivery date
 *   }
 *
 * Common Anti-Patterns to Avoid:
 * -------------------------------
 * ❌ const dateStr = date.toISOString().split('T')[0]; // Uses UTC
 * ❌ const dateStr = `${year}-${month}-${day}`; // No timezone awareness
 * ❌ if (date < new Date()) { } // Timezone-naive comparison
 *
 * Correct Patterns:
 * -----------------
 * ✅ const dateStr = getPSTDateString(date); // PST-aware
 * ✅ const displayStr = formatPSTDate(date, 'short'); // Formatted for display
 * ✅ if (isInPSTPast(date)) { } // Timezone-aware comparison
 *
 * ============================================================================
 */

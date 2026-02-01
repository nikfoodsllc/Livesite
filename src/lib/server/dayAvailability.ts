/**
 * ============================================================================
 * DEPRECATION NOTICE
 * ============================================================================
 *
 * ⚠️  THIS FILE IS DEPRECATED ⚠️
 *
 * All functions in this file are deprecated and will be removed in a future release.
 * New code should use @/lib/server/availableDates.ts instead.
 *
 * MIGRATION PATH:
 * ---------------
 * The day-based availability system has been replaced by a date-based system.
 * Update your code to use the new availableDates.ts module:
 *
 * Old (dayAvailability.ts)                    New (availableDates.ts)
 * ---------------------                       ----------------------
 * getEnabledDaysFromDB()              →    getAvailableDatesFromDatabase()
 * generateAvailableDays()             →    generateAvailableDateOptions()
 * getNextAvailableDay()               →    getNextAvailableDate()
 * getDayOption(dayName)               →    (use specific date queries instead)
 * isDayDisabled(date)                 →    isDateDisabled(date)
 * isTomorrow(date)                    →    (use PST timezone utilities directly)
 * getEnabledDaysFromDatabase()        →    getAvailableDatesFromDatabase()
 *
 * For new development, always use availableDates.ts functions which provide:
 * - Date-specific availability (not day-of-week based)
 * - Better timezone handling
 * - flatCategoryEnabled filtering
 * - More flexible date range queries
 *
 * ============================================================================
 *
 * SERVER-ONLY FILE
 * This file contains server-side logic and must NEVER be imported by client components.
 * Client components should import from dayAvailabilityClient.ts instead.
 */

import { DayType } from '@/types/cart';
import {
  getPSTNow,
  getPSTHour,
  getPSTTimeComponents,
  getPSTMidnight,
  getPSTWeekdayNumber,
  isPSTToday,
  isInPSTPast,
  PST_TIMEZONE,
  getPSTDateString,
} from '@/lib/timezone';

/**
 * ============================================================================
 * DAY AVAILABILITY LOGIC
 * ============================================================================
 *
 * Day availability is now controlled solely by admin panel settings.
 * Days are enabled or disabled through the database 'enabled' field.
 *
 * TIMEZONE CONSIDERATIONS:
 * -----------------------
 * - All date calculations use Pacific Time (America/Los_Angeles)
 * - PST (UTC-8) automatically converts to PDT (UTC-7) during daylight saving
 * - Date displays always show in Pacific Time zone
 * - Customers in other time zones see dates in Pacific Time
 *
 * IMPLEMENTATION NOTES:
 * --------------------
 * - All date comparisons use the timezone utilities from @/lib/timezone
 * - Days are fetched from database with their enabled status
 * - No time-based cutoff restrictions are applied
 *
 * ============================================================================
 */


/**
 * Available day configuration from database
 */
export interface AvailableDay {
  _id: string;
  day: string;
  label: string;
  sequence: number;
  enabled: boolean;
}

/**
 * Fetch enabled days from the availableDays collection in the database
 *
 * @deprecated Use getAvailableDatesFromDatabase() from @/lib/server/availableDates.ts instead.
 * This function is part of the old day-based system and will be removed in a future release.
 *
 * @param includeDisabledFromDB - If true, fetch all days (both enabled and disabled). If false, only fetch enabled days. Default: false.
 * @returns Promise<AvailableDay[]> - Array of day objects with full configuration
 */
export async function getEnabledDaysFromDatabase(includeDisabledFromDB: boolean = false): Promise<AvailableDay[]> {
  console.warn('⚠️  DEPRECATED: getEnabledDaysFromDatabase() is deprecated. Use getAvailableDatesFromDatabase() from @/lib/server/availableDates.ts for new code.');
  try {
    const { db } = await import('@/lib/server/db');
    // Only filter by enabled if we're not including disabled days
    const query = includeDisabledFromDB ? {} : { enabled: true };
    const result = await db.read('availableDays', query, {
      sort: { sequence: 1 }
    });

    if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
      const availableDays: AvailableDay[] = result.data.map((dayData: any) => ({
        _id: dayData._id?.toString() || '',
        day: typeof dayData.day === 'string' ? dayData.day.trim().toLowerCase() : '',
        label: typeof dayData.label === 'string' ? dayData.label.trim() : '',
        sequence: typeof dayData.sequence === 'number' ? dayData.sequence : 0,
        enabled: dayData.enabled === true,
      })).filter((day: AvailableDay) => day.day.length > 0);

      console.log(`✅ Fetched ${includeDisabledFromDB ? 'all' : 'enabled'} days from database:`, availableDays);
      return availableDays;
    }
  } catch (error) {
    console.error('❌ Failed to fetch days from database:', error);
  }

  return [];
}

/**
 * Fetch enabled days from the availableDays collection in the database
 *
 * @deprecated Use getAvailableDatesFromDatabase() from @/lib/server/availableDates.ts instead.
 * This function is part of the old day-based system and will be removed in a future release.
 *
 * @returns Promise<string[]> - Array of enabled day names (lowercase, e.g., 'tuesday', 'wednesday')
 */
export async function getEnabledDaysFromDB(): Promise<string[]> {
  console.warn('⚠️  DEPRECATED: getEnabledDaysFromDB() is deprecated. Use getAvailableDatesFromDatabase() from @/lib/server/availableDates.ts for new code.');
  // Always fetch from API endpoint (works on both client and server)
  try {
    const response = await fetch('/api/enabled-days');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.days && Array.isArray(data.days) && data.days.length > 0) {
        console.log('✅ Fetched enabled days from API:', data.days);
        return data.days;
      }
    }
  } catch (error) {
    console.error('❌ Failed to fetch enabled days from API:', error);
  }

  return [];
}

/**
 * Available day option with metadata
 */
export interface DayOption {
  id: string; // Database ID (_id converted to string)
  day: string; // lowercase day name (e.g., 'tuesday', 'wednesday')
  label: string; // Display label from database (e.g., 'Tue', 'Wed')
  sequence: number; // Sort order from database
  enabled: boolean; // Whether the day is currently enabled (inverse of old 'disabled' field)
  date: string; // ISO format: YYYY-MM-DD
  formattedDate: string; // Display format: "Friday (Jan 2)"
  fullDate: Date;
  isToday: boolean;
}

/**
 * Check if a given date is tomorrow (in PST timezone)
 *
 * @deprecated This function is deprecated. Use PST timezone utilities directly from @/lib/timezone.ts.
 * This function will be removed in a future release.
 *
 * @param date - The date to check
 * @param now - Optional current date for testing (defaults to PST now)
 * @returns true if the date is tomorrow in PST
 */
export function isTomorrow(date: Date, now: Date = getPSTNow()): boolean {
  console.warn('⚠️  DEPRECATED: isTomorrow() is deprecated. Use PST timezone utilities from @/lib/timezone.ts for new code.');
  const startOfToday = getPSTMidnight(now);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const targetDate = getPSTMidnight(date);

  return targetDate.getTime() === startOfTomorrow.getTime();
}

/**
 * Check if a specific day should be disabled based on current Pacific Time
 *
 * @deprecated Use isDateDisabled() from @/lib/server/availableDates.ts instead.
 * This function is part of the old day-based system and will be removed in a future release.
 *
 * @param date - The date to check
 * @returns true if the day should be disabled (only checks past dates)
 */
export function isDayDisabled(date: Date): boolean {
  console.warn('⚠️  DEPRECATED: isDayDisabled() is deprecated. Use isDateDisabled() from @/lib/server/availableDates.ts for new code.');
  const now = getPSTNow();
  return isInPSTPast(date, now);
}

/**
 * Generate available day options based on database configuration (in Pacific Time timezone)
 * Returns only enabled days from database, excludes disabled days
 *
 * @deprecated Use generateAvailableDateOptions() from @/lib/server/availableDates.ts instead.
 * This function is part of the old day-based system and will be removed in a future release.
 *
 * @param includeDisabled - If true, include disabled days in results (default: false)
 * @returns Promise<DayOption[]> - Array of available day options (empty array if no days found in database)
 */
export async function generateAvailableDays(includeDisabled: boolean = false): Promise<DayOption[]> {
  console.warn('⚠️  DEPRECATED: generateAvailableDays() is deprecated. Use generateAvailableDateOptions() from @/lib/server/availableDates.ts for new code.');
  const now = getPSTNow();
  const startOfToday = getPSTMidnight(now);

  // Fetch full available day records from database
  // When includeDisabled=true, fetch all days (both enabled and disabled from DB)
  const enabledDaysRecords = await getEnabledDaysFromDatabase(includeDisabled);

  // Return empty array if no days found in database
  if (!enabledDaysRecords || enabledDaysRecords.length === 0) {
    return [];
  }

  // Map weekday numbers to day names
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Build a map of day names to their weekday numbers for quick lookup
  const dayNameToWeekdayMap = new Map<string, number>();
  weekdayNames.forEach((name, index) => {
    dayNameToWeekdayMap.set(name.toLowerCase(), index);
  });

  const options: DayOption[] = [];

  // For each enabled day from the database, calculate the next occurrence
  for (const dbRecord of enabledDaysRecords) {
    const targetWeekday = dayNameToWeekdayMap.get(dbRecord.day);

    // Skip if day name is not recognized
    if (targetWeekday === undefined) {
      console.warn(`⚠️  Unknown day name in database: ${dbRecord.day}`);
      continue;
    }

    // Calculate the next occurrence of this day
    const currentWeekday = getPSTWeekdayNumber(now);
    const date = new Date(startOfToday);

    // Calculate days until next occurrence
    let daysUntilTarget = (targetWeekday - currentWeekday + 7) % 7;

    // If today is the target day and it's already past midnight, move to next week
    if (daysUntilTarget === 0) {
      // Check if current time is past midnight - if so, next occurrence is next week
      const currentTime = now.getTime();
      const targetMidnight = startOfToday.getTime();
      if (currentTime < targetMidnight) {
        // It's before midnight today, so today's occurrence is still valid
        daysUntilTarget = 0;
      } else {
        // It's after midnight today, so next occurrence is 7 days away
        daysUntilTarget = 7;
      }
    }

    // Set the date to the next occurrence
    date.setDate(date.getDate() + daysUntilTarget);

    const pstMidnight = getPSTMidnight(date);
    const isCurrentDay = isPSTToday(date, now);

    // Check if disabled based on time (only past dates)
    const isTimeDisabled = isDayDisabled(date);

    // Combine database enabled status with time-based disabled status
    // A day is only enabled if it's enabled in database AND not in the past
    const isEnabled = dbRecord.enabled && !isTimeDisabled;

    // Format date for display (in PST timezone) with weekday name
    const formattedDate = pstMidnight.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      timeZone: PST_TIMEZONE,
    });

    // ISO format for storage
    const isoDate = getPSTDateString(date);

    options.push({
      id: dbRecord._id,
      day: dbRecord.day,
      label: dbRecord.label,
      sequence: dbRecord.sequence,
      enabled: isEnabled,
      date: isoDate,
      formattedDate,
      fullDate: new Date(date),
      isToday: isCurrentDay,
    });
  }

  // Sort by sequence in ascending order
  options.sort((a, b) => a.sequence - b.sequence);

  // Filter out disabled days unless explicitly requested
  if (!includeDisabled) {
    return options.filter((opt) => opt.enabled);
  }

  return options;
}

/**
 * Get the next available day for ordering
 * Returns the first non-disabled day from today onwards
 *
 * @deprecated Use getNextAvailableDate() from @/lib/server/availableDates.ts instead.
 * This function is part of the old day-based system and will be removed in a future release.
 *
 * @returns Promise<DayOption | null> - The next available day option, or null if none available
 */
export async function getNextAvailableDay(): Promise<DayOption | null> {
  console.warn('⚠️  DEPRECATED: getNextAvailableDay() is deprecated. Use getNextAvailableDate() from @/lib/server/availableDates.ts for new code.');
  const availableDays = await generateAvailableDays();
  return availableDays.length > 0 ? availableDays[0] : null;
}

/**
 * Get day option for a specific day name
 *
 * @deprecated This function is deprecated. Use date-based queries from @/lib/server/availableDates.ts instead.
 * The new system uses specific dates rather than day-of-week patterns.
 * This function will be removed in a future release.
 *
 * @param dayName - The day to get (lowercase, e.g., 'monday')
 * @returns Promise<DayOption | null> - Day option if available, null if disabled
 */
export async function getDayOption(dayName: string): Promise<DayOption | null> {
  console.warn('⚠️  DEPRECATED: getDayOption() is deprecated. Use date-based queries from @/lib/server/availableDates.ts for new code.');
  const allDays = await generateAvailableDays(true);
  return allDays.find((opt) => opt.day === dayName) || null;
}

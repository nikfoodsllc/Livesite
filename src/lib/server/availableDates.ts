/**
 * ============================================================================
 * AVAILABLE DATES SERVER UTILITIES
 * ============================================================================
 *
 * This module provides server-side utilities for fetching and processing
 * available calendar dates from the database with flatCategoryEnabled filtering.
 *
 * Database Collection: availableDates (shared with CXGP03 admin system)
 * Filter: flatCategoryEnabled must be true
 *
 * All date operations use PST timezone utilities from /src/lib/timezone.ts
 */

import { db } from './db';
import {
  getPSTNow,
  isInPSTPast,
  isPSTToday,
  PST_TIMEZONE,
  getPSTDateString,
  isAfterOrEqualPSTHour,
  addPSTDays,
  getPSTMidnight,
} from '@/lib/timezone';

/**
 * Date Option Interface
 * Represents a calendar date option for the frontend
 */
export interface DateOption {
  /** Unique identifier (typically the date string in YYYY-MM-DD format) */
  id: string;
  /** Date in YYYY-MM-DD format (ISO date string) */
  date: string;
  /** Whether flat category is enabled for this date */
  flatCategoryEnabled: boolean;
  /** Whether day-wise category is enabled for this date */
  dayWiseCategoryEnabled: boolean;
  /** Formatted date for display (e.g., "Friday (Jan 15)") */
  formattedDate: string;
  /** Full date with timezone information */
  fullDate: string;
  /** Whether this date is today in PST timezone */
  isToday: boolean;
  /** Whether this date is in the past (timezone-aware) */
  isPast: boolean;
  /**
   * Whether this date is past the cutoff time (1 PM PST the day before)
   *
   * CUTOFF RULE: A 'day' is considered available until 1 PM PST the DAY BEFORE.
   * Example: Friday orders close at 1 PM PST on Thursday.
   *
   * Distinction from isPast:
   * - isPast: The date itself has passed (e.g., it's currently Saturday, so Friday is in the past)
   * - isPastCutoff: The cutoff time has passed, even though the date hasn't (e.g., it's Thursday 2 PM PST,
   *   so Friday's date hasn't passed but you can no longer order for Friday)
   *
   * A date can be isPast=false but isPastCutoff=true.
   * Example: Thursday 2 PM PST - Friday is not in the past (isPast=false) but is past cutoff (isPastCutoff=true)
   */
  isPastCutoff: boolean;
}

/**
 * Database Document Interface for availableDates collection
 */
interface AvailableDateDocument {
  _id?: string;
  date: string; // YYYY-MM-DD format
  flatCategoryEnabled: boolean;
  dayWiseCategoryEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Check if a date should be disabled due to the 1 PM PST cutoff time
 *
 * CUTOFF RULE: A 'day' is considered available until 1 PM PST the DAY BEFORE.
 * Example: Friday orders close at 1 PM PST on Thursday.
 *
 * This function determines if the cutoff time has passed for a given target date.
 * The cutoff only applies to tomorrow's date - not today or any future dates beyond tomorrow.
 *
 * @param targetDate - The date to check (as Date object)
 * @returns true if the date is past cutoff and should be disabled, false otherwise
 *
 * @example
 * // Thursday 10 AM PST, checking Friday
 * isPastCutoffTime(fridayDate); // Returns false (Friday still available)
 *
 * @example
 * // Thursday 1 PM PST, checking Friday
 * isPastCutoffTime(fridayDate); // Returns true (Friday past cutoff)
 *
 * @example
 * // Thursday 2 PM PST, checking Saturday
 * isPastCutoffTime(saturdayDate); // Returns false (Saturday still available)
 */
function isPastCutoffTime(targetDate: Date): boolean {
  const now = getPSTNow();

  // Get midnight for today and the target date in PST timezone
  const todayMidnight = getPSTMidnight(now);
  const targetMidnight = getPSTMidnight(targetDate);

  // Calculate tomorrow's midnight by adding 1 day to today's midnight
  const tomorrowMidnight = addPSTDays(todayMidnight, 1);

  // The cutoff only applies to tomorrow's date
  // If the target date is NOT tomorrow, it's not affected by cutoff
  if (targetMidnight.getTime() !== tomorrowMidnight.getTime()) {
    return false;
  }

  // For tomorrow's date, check if current time is past 1 PM PST (13:00)
  // If it's 1 PM PST or later, tomorrow is past cutoff and should be disabled
  return isAfterOrEqualPSTHour(13, now);
}

/**
 * Fetch available dates from database with flatCategoryEnabled filtering
 *
 * @param startDate - Optional start date in YYYY-MM-DD format (defaults to today)
 * @param endDate - Optional end date in YYYY-MM-DD format (defaults to 60 days from start)
 * @returns Array of available date documents from database
 */
export async function getAvailableDatesFromDatabase(
  startDate?: string,
  endDate?: string
): Promise<AvailableDateDocument[]> {
  try {
    // If no dates provided, default to today to 60 days future
    if (!startDate) {
      const today = getPSTNow();
      startDate = getPSTDateString(today);
    }

    if (!endDate) {
      const start = new Date(startDate);
      const endDateObj = new Date(start);
      endDateObj.setDate(endDateObj.getDate() + 60);
      endDate = getPSTDateString(endDateObj);
    }

    // Build query filter
    const filter: any = {
      flatCategoryEnabled: true,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Query the database
    const result = await db.read<AvailableDateDocument>('availableDates', filter, {
      sort: { date: 1 }, // Sort ascending by date
    });

    if (!result.success || !result.data) {
      console.error('Failed to fetch available dates from database:', result.error);
      return [];
    }

    return result.data;
  } catch (error) {
    console.error('Error in getAvailableDatesFromDatabase:', error);
    return [];
  }
}

/**
 * Convert database records to DateOption format with PST timezone handling
 *
 * @param documents - Array of available date documents from database
 * @param includeDisabled - Whether to include dates where flatCategoryEnabled is false (default: false)
 * @returns Array of DateOption objects for frontend consumption
 */
export function generateAvailableDateOptions(
  documents: AvailableDateDocument[],
  includeDisabled: boolean = false
): DateOption[] {
  const now = getPSTNow();

  return documents
    .filter((doc) => includeDisabled || doc.flatCategoryEnabled)
    .map((doc) => {
      /*
       * PST Midnight Pattern: Parse date-only string (YYYY-MM-DD) as midnight PST
       * See: docs/standards/date-handling-convention.md
       *
       * Append 'T00:00:00.000-08:00' to create Date object at midnight PST.
       * When formatted with PST_TIMEZONE, this displays the correct PST date.
       */
      const dateObj = new Date(doc.date + 'T00:00:00.000-08:00');

      // Format date as "Friday (Jan 15)" using PST timezone
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: PST_TIMEZONE,
      });

      // Format full date with timezone
      const fullDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: PST_TIMEZONE,
      });

      // Check if date is today (timezone-aware)
      const isToday = isPSTToday(dateObj);

      // Check if date is in the past (timezone-aware)
      const isPast = isInPSTPast(dateObj);

      /*
       * CUTOFF TIME CALCULATION
       * =======================
       *
       * CUTOFF RULE: A 'day' is considered available until 1 PM PST the DAY BEFORE.
       * Example: Friday orders close at 1 PM PST on Thursday.
       *
       * The isPastCutoff field indicates whether the cutoff time has passed for this date,
       * even if the date itself hasn't passed yet. This is distinct from isPast:
       *
       * - isPast: The date itself has passed (e.g., it's currently Saturday, so Friday is in the past)
       * - isPastCutoff: The cutoff time has passed (e.g., it's Thursday 2 PM PST, so Friday
       *   hasn't happened yet but you can no longer order for it)
       *
       * Examples:
       * 1. Thursday 10 AM PST: Friday is isPast=false, isPastCutoff=false (available)
       * 2. Thursday 1 PM PST: Friday is isPast=false, isPastCutoff=true (unavailable - past cutoff)
       * 3. Thursday 2 PM PST: Friday is isPast=false, isPastCutoff=true (unavailable - past cutoff)
       * 4. Friday 10 AM PST: Friday is isPast=false, isPastCutoff=false (today, can't order anyway)
       * 5. Friday 2 PM PST: Saturday is isPast=false, isPastCutoff=false (available)
       *
       * IMPORTANT: The cutoff logic only applies to tomorrow's date.
       * - Today: Always disabled for ordering (isPast=false for today itself, but business logic prevents same-day orders)
       * - Tomorrow: Check if past 1 PM PST cutoff
       * - Future (beyond tomorrow): Not affected by cutoff
       */
      const isPastCutoff = isPastCutoffTime(dateObj);

      return {
        id: doc.date,
        date: doc.date,
        flatCategoryEnabled: doc.flatCategoryEnabled,
        dayWiseCategoryEnabled: doc.dayWiseCategoryEnabled,
        formattedDate,
        fullDate,
        isToday,
        isPast,
        isPastCutoff,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date)); // Ensure ascending sort
}

/**
 * Get the next available date from today onwards
 *
 * @returns The first available DateOption from today, or null if none found
 */
export async function getNextAvailableDate(): Promise<DateOption | null> {
  try {
    const today = getPSTNow();
    const startDate = getPSTDateString(today);

    // Fetch dates from today onwards (extended range to find next available)
    const endDateObj = new Date(today);
    endDateObj.setDate(endDateObj.getDate() + 365); // Look ahead 1 year
    const endDate = getPSTDateString(endDateObj);

    const documents = await getAvailableDatesFromDatabase(startDate, endDate);

    if (!documents || documents.length === 0) {
      return null;
    }

    // Convert to DateOptions and filter out past dates and dates past cutoff
    const dateOptions = generateAvailableDateOptions(documents, false);
    const availableDates = dateOptions.filter((option) => !option.isPast && !option.isPastCutoff);

    // Return the first available date
    return availableDates.length > 0 ? availableDates[0] : null;
  } catch (error) {
    console.error('Error in getNextAvailableDate:', error);
    return null;
  }
}

/**
 * Check if a date is disabled (in the past or past cutoff time)
 * This is a timezone-aware check using PST timezone
 *
 * A date is considered disabled if:
 * 1. The date itself has passed (isPast), OR
 * 2. The cutoff time has passed (isPastCutoff) - i.e., it's past 1 PM PST the day before
 *
 * @param date - Date string in YYYY-MM-DD format or Date object
 * @returns true if the date is disabled (past or past cutoff), false otherwise
 */
export function isDateDisabled(date: string | Date): boolean {
  try {
    let dateObj: Date;

    if (typeof date === 'string') {
      /*
       * PST Midnight Pattern: Parse date-only string (YYYY-MM-DD) as midnight PST
       * See: docs/standards/date-handling-convention.md
       *
       * Append 'T00:00:00.000-08:00' to create Date object at midnight PST.
       * When formatted with PST_TIMEZONE, this displays the correct PST date.
       */
      dateObj = new Date(date + 'T00:00:00.000-08:00');
    } else {
      dateObj = date;
    }

    // Check if date is in the past
    const isPast = isInPSTPast(dateObj);

    // Check if cutoff time has passed (1 PM PST the day before)
    const isPastCutoff = isPastCutoffTime(dateObj);

    // Date is disabled if it's in the past OR if the cutoff time has passed
    return isPast || isPastCutoff;
  } catch (error) {
    console.error('Error in isDateDisabled:', error);
    return false;
  }
}

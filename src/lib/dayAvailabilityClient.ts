import { DayType } from '@/types/cart';
import { PST_TIMEZONE, getPSTWeekday } from '@/lib/timezone';

/**
 * Available date option with metadata
 *
 * @remarks
 * This interface represents the new date-based system.
 * It maps to the DateOption interface from @/lib/server/availableDates.ts
 * but is renamed here to avoid breaking existing imports.
 *
 * The new system uses actual calendar dates instead of recurring day names.
 */
export interface DayOption {
  /** Unique identifier (the date string in YYYY-MM-DD format) */
  id: string;
  /** Date in YYYY-MM-DD format (ISO date string) */
  date: string;
  /** Whether flat category is enabled for this date */
  flatCategoryEnabled: boolean;
  /** Whether day-wise category is enabled for this date */
  dayWiseCategoryEnabled: boolean;
  /** Formatted date for display (e.g., "Friday, Jan 15") */
  formattedDate: string;
  /** Full date with timezone information */
  fullDate: string;
  /** Whether this date is today in PST timezone */
  isToday: boolean;
  /** Whether this date is in the past (timezone-aware) */
  isPast: boolean;

  // Computed property for backward compatibility
  /** Day name extracted from date (e.g., 'monday', 'tuesday') */
  day?: string;
  /** Whether the date is enabled (alias for flatCategoryEnabled) */
  enabled?: boolean;
}

/**
 * Client-side functions for day availability
 *
 * @remarks
 * MIGRATION GUIDE:
 * The following functions are DEPRECATED and will be removed in a future version:
 * - getEnabledDaysFromAPI()
 * - generateAvailableDaysFromAPI()
 * - getDayOptionFromAPI()
 *
 * Please migrate to using generateAvailableDatesFromAPI() which provides:
 * - Actual calendar dates instead of recurring day names
 * - Better date range filtering (startDate/endDate parameters)
 * - More consistent date handling across the application
 * - Support for specific date queries instead of generic day names
 *
 * The DayOption interface is maintained as it's still used by the new date-based system.
 */

/**
 * Fetch enabled days from the API
 *
 * @deprecated This function is deprecated and will be removed in a future version.
 *             Use generateAvailableDatesFromAPI() instead, which provides actual calendar dates
 *             rather than just day names.
 *
 * @example
 * // Instead of:
 * const days = await getEnabledDaysFromAPI();
 *
 * // Use:
 * const dates = await generateAvailableDatesFromAPI();
 * const enabledDays = dates.filter(d => d.enabled);
 *
 * @returns Promise<string[]> - Array of enabled day names (e.g., ['tuesday', 'wednesday'])
 */
export async function getEnabledDaysFromAPI(): Promise<string[]> {
  // Issue deprecation warning
  console.warn(
    'DEPRECATION WARNING: getEnabledDaysFromAPI() is deprecated. ' +
    'Use generateAvailableDatesFromAPI() instead for actual calendar dates. ' +
    'This function will be removed in a future version.'
  );

  try {
    const response = await fetch('/api/enabled-days');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.days && Array.isArray(data.days)) {
        return data.days;
      }
    }
  } catch (error) {
    console.error('Error fetching enabled days from API:', error);
  }

  return [];
}

/**
 * Fetch available days from the API
 *
 * @deprecated This function is deprecated and will be removed in a future version.
 *             Use generateAvailableDatesFromAPI() instead, which provides actual calendar dates
 *             with proper date handling and better filtering options.
 *
 * @example
 * // Instead of:
 * const days = await generateAvailableDaysFromAPI(false);
 *
 * // Use:
 * const dates = await generateAvailableDatesFromAPI(false);
 *
 * @param includeDisabled - Whether to include disabled days (default: false)
 * @returns Promise<DayOption[]> - Array of day options with day names (not actual dates)
 */
export async function generateAvailableDaysFromAPI(includeDisabled: boolean = false): Promise<DayOption[]> {
  // Issue deprecation warning
  console.warn(
    'DEPRECATION WARNING: generateAvailableDaysFromAPI() is deprecated. ' +
    'Use generateAvailableDatesFromAPI() instead for actual calendar dates with proper date handling. ' +
    'This function will be removed in a future version.'
  );

  try {
    const url = `/api/days/available?includeDisabled=${includeDisabled}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.days && Array.isArray(data.days)) {
        return data.days;
      }
    }
  } catch (error) {
    console.error('Error generating available days from API:', error);
  }

  return [];
}

/**
 * Fetch a specific day option from the API
 *
 * @deprecated This function is deprecated and will be removed in a future version.
 *             Use generateAvailableDatesFromAPI() instead, which returns all available dates
 *             and allows filtering by specific criteria. This function only fetches a single day
 *             by name, not by actual date.
 *
 * @example
 * // Instead of:
 * const tuesday = await getDayOptionFromAPI('tuesday');
 *
 * // Use:
 * const dates = await generateAvailableDatesFromAPI();
 * const tuesday = dates.find(d => d.day === 'tuesday');
 *
 * @param dayName - The name of the day to fetch (e.g., 'tuesday', 'wednesday')
 * @returns Promise<DayOption | null> - The day option if found, null otherwise
 */
export async function getDayOptionFromAPI(dayName: string): Promise<DayOption | null> {
  // Issue deprecation warning
  console.warn(
    'DEPRECATION WARNING: getDayOptionFromAPI() is deprecated. ' +
    'Use generateAvailableDatesFromAPI() instead to get all available dates and filter as needed. ' +
    'This function will be removed in a future version.'
  );

  try {
    const url = `/api/days/option?dayName=${encodeURIComponent(dayName)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data.dayOption;
      }
    }
  } catch (error) {
    console.error('Error getting day option from API:', error);
  }

  return null;
}

/**
 * Fetch available dates from the API
 * This is the new recommended function for fetching delivery dates
 *
 * @param includeDisabled - Whether to include disabled dates (default: false)
 * @param startDate - Optional start date in ISO format (YYYY-MM-DD)
 * @param endDate - Optional end date in ISO format (YYYY-MM-DD)
 * @returns Array of DayOption objects with actual calendar dates and backward compatibility fields
 */
export async function generateAvailableDatesFromAPI(
  includeDisabled: boolean = false,
  startDate?: string,
  endDate?: string
): Promise<DayOption[]> {
  try {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('startDate', startDate);
    }

    if (endDate) {
      params.append('endDate', endDate);
    }

    const url = `/api/available-dates?${params.toString()}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.dates && Array.isArray(data.dates)) {
        // Transform the new DateOption format to include backward compatibility fields
        return data.dates.map((dateOption: any) => {
          // Extract day name from formattedDate (e.g., "Friday, Jan 15" -> "Friday")
          const dayName = dateOption.formattedDate.split(',')[0];

          return {
            ...dateOption,
            day: dayName, // Add backward compatibility field
            enabled: dateOption.flatCategoryEnabled, // Add backward compatibility alias
          };
        });
      }
    }
  } catch (error) {
    console.error('Error generating available dates from API:', error);
  }

  return [];
}

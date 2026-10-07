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
import { ObjectId } from 'mongodb';
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
import {
  cutoffInfo,
  DEFAULT_CUTOFF_HOUR_BY_KIND,
  isPastCustomCutoff,
  ITEM_KINDS,
  normalizeDateString,
  overrideFor,
  parseCutoffOverride,
  type ClosedLine,
  type ItemKind,
} from './orderCutoff';

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
  /**
   * When ordering for this date closes (ISO moment): the admin's custom cutoff if one is set,
   * otherwise the standard 1 PM Pacific the day before.
   */
  closesAt?: string;
  /** True when `closesAt` is a custom cutoff set by an admin for this date. */
  cutoffOverridden?: boolean;
  /**
   * Flat items and day-wise (Food Menu) items have their own cutoff. `isPastCutoff` above is true only when BOTH
   * have passed (the whole date is closed); these say which kind has closed, and when each closes.
   */
  flatPastCutoff?: boolean;
  dayWisePastCutoff?: boolean;
  flatClosesAt?: string;
  dayWiseClosesAt?: string;
  flatCutoffOverridden?: boolean;
  dayWiseCutoffOverridden?: boolean;
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
  /** Older single custom cutoff: applies to both kinds of items when the kind's own field is not set. */
  cutoffAt?: Date | string | null;
  /** Custom order cutoff of this date for flat items (an absolute moment). Missing = the standard rule. */
  flatCutoffAt?: Date | string | null;
  /** Custom order cutoff of this date for day-wise (Food Menu) items (an absolute moment). Missing = the standard rule. */
  dayWiseCutoffAt?: Date | string | null;
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
function isPastCutoffTime(targetDate: Date, customCutoff?: Date | string | null, kind: ItemKind = 'day-wise'): boolean {
  // An admin-set cutoff for this date replaces the standard rule completely: it closes the date at that
  // moment and, if it is later than the standard cutoff, keeps the date open until then.
  if (parseCutoffOverride(customCutoff)) return isPastCustomCutoff(customCutoff);

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

  // For tomorrow's date, check if the current time is past the standard hour of this kind of item
  // (5 PM PST for flat items, 1 PM PST for day-wise items); from then on tomorrow is past cutoff
  return isAfterOrEqualPSTHour(DEFAULT_CUTOFF_HOUR_BY_KIND[kind], now);
}

/**
 * Resolve the default date range used by /api/available-dates (today → +60 days, PST).
 */
function resolveDefaultDateRange(
  startDate?: string,
  endDate?: string
): { startDate: string; endDate: string } {
  let resolvedStart = startDate;
  if (!resolvedStart) {
    resolvedStart = getPSTDateString(getPSTNow());
  }

  let resolvedEnd = endDate;
  if (!resolvedEnd) {
    const start = new Date(resolvedStart + 'T00:00:00.000-08:00');
    const endDateObj = new Date(start);
    endDateObj.setDate(endDateObj.getDate() + 60);
    resolvedEnd = getPSTDateString(endDateObj);
  }

  return { startDate: resolvedStart, endDate: resolvedEnd };
}

/**
 * Orderable day-wise delivery dates — same window and cutoff rules as /api/available-dates.
 * Used by menu APIs so items are only returned for dates customers can actually order.
 */
export async function getOrderableDayWiseDateStrings(
  startDate?: string,
  endDate?: string
): Promise<string[]> {
  try {
    const { startDate: start, endDate: end } = resolveDefaultDateRange(startDate, endDate);

    const result = await db.read<AvailableDateDocument>(
      'availableDates',
      {
        dayWiseCategoryEnabled: true,
        date: { $gte: start, $lte: end },
      },
      { sort: { date: 1 } }
    );

    if (!result.success || !result.data) {
      console.error('Failed to fetch orderable day-wise dates:', result.error);
      return [];
    }

    return result.data
      .map((doc) => ({ date: doc.date.trim(), cutoffAt: overrideFor(doc, 'day-wise') as Date | string | null | undefined }))
      .filter(({ date }) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(date))
      .filter(({ date, cutoffAt }) => !isDateDisabled(date, cutoffAt, 'day-wise'))
      .map(({ date }) => date);
  } catch (error) {
    console.error('Error in getOrderableDayWiseDateStrings:', error);
    return [];
  }
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
  endDate?: string,
  /** true = also dates that only have day-wise (Food Menu) items switched on; false = dates with flat items on (the older rule) */
  anyKindEnabled = false
): Promise<AvailableDateDocument[]> {
  try {
    const { startDate: start, endDate: end } = resolveDefaultDateRange(startDate, endDate);

    // Build query filter
    const filter: Record<string, unknown> = {
      ...(anyKindEnabled
        ? { $or: [{ flatCategoryEnabled: true }, { dayWiseCategoryEnabled: true }] }
        : { flatCategoryEnabled: true }),
      date: {
        $gte: start,
        $lte: end,
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
      // each kind of item has its own cutoff; the date as a whole is closed only when both have passed
      const flatOverride = overrideFor(doc, 'flat') as Date | string | null | undefined;
      const dayWiseOverride = overrideFor(doc, 'day-wise') as Date | string | null | undefined;
      const flatPastCutoff = isPastCutoffTime(dateObj, flatOverride, 'flat');
      const dayWisePastCutoff = isPastCutoffTime(dateObj, dayWiseOverride, 'day-wise');
      const isPastCutoff = flatPastCutoff && dayWisePastCutoff;
      const flatCutoff = cutoffInfo(doc.date, flatOverride, 'flat');
      const dayWiseCutoff = cutoffInfo(doc.date, dayWiseOverride, 'day-wise');
      // the single "closes at" of the date is when it closes completely: the later of the two
      const cutoff = flatCutoff.closesAt.getTime() >= dayWiseCutoff.closesAt.getTime() ? flatCutoff : dayWiseCutoff;

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
        closesAt: cutoff.closesAt.toISOString(),
        cutoffOverridden: flatCutoff.overridden || dayWiseCutoff.overridden,
        flatPastCutoff,
        dayWisePastCutoff,
        flatClosesAt: flatCutoff.closesAt.toISOString(),
        dayWiseClosesAt: dayWiseCutoff.closesAt.toISOString(),
        flatCutoffOverridden: flatCutoff.overridden,
        dayWiseCutoffOverridden: dayWiseCutoff.overridden,
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
export function isDateDisabled(date: string | Date, customCutoff?: Date | string | null, kind: ItemKind = 'day-wise'): boolean {
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
    const isPastCutoff = isPastCutoffTime(dateObj, customCutoff, kind);

    // Date is disabled if it's in the past OR if the cutoff time has passed
    return isPast || isPastCutoff;
  } catch (error) {
    console.error('Error in isDateDisabled:', error);
    return false;
  }
}

/** A cart or order line to check against the cutoffs. */
export interface LineToCheck {
  date: unknown;
  foodItemId?: unknown;
  /** Flat or day-wise. When not given it is worked out from where the item is listed (see below). */
  kind?: ItemKind;
  /** The item's name, used in the message shown to the customer. */
  name?: string;
}

/**
 * Of these lines (the items in a customer's cart or order, each for a delivery date), the ones ordering has
 * closed for. Flat items and day-wise items have their own cutoff, so one day can be open for one kind and closed
 * for the other. A line's kind is the one given, otherwise it comes from how the item is listed: an item listed
 * for that date in a day-wise category is day-wise (even if it is also a flat item), otherwise one under a flat
 * category is flat. An item that is not listed anywhere counts as day-wise (the earlier cutoff). A date in the past is closed for every kind.
 * If the database cannot be read this returns nothing (never block a sale because of a lookup problem).
 */
export async function findClosedLines(lines: LineToCheck[]): Promise<ClosedLine[]> {
  const checked = lines
    .map((l) => ({
      date: normalizeDateString(l.date),
      foodItemId: l.foodItemId === undefined || l.foodItemId === null ? undefined : String(l.foodItemId),
      kind: l.kind,
      name: l.name,
    }))
    .filter((l): l is { date: string; foodItemId: string | undefined; kind: ItemKind | undefined; name: string | undefined } => l.date !== null);
  if (checked.length === 0) return [];

  const dates = Array.from(new Set(checked.map((l) => l.date)));
  const docs = new Map<string, AvailableDateDocument>();
  const flatItems = new Set<string>();
  const dayWiseDates = new Map<string, Set<string>>();
  try {
    const result = await db.read<AvailableDateDocument>('availableDates', { date: { $in: dates } });
    if (!result.success || !result.data) {
      console.error('findClosedLines: could not read availableDates:', result.error);
      return [];
    }
    for (const doc of result.data) docs.set(doc.date.trim(), doc);

    const needKind = Array.from(
      new Set(checked.filter((l) => !l.kind && l.foodItemId && /^[0-9a-fA-F]{24}$/.test(l.foodItemId)).map((l) => l.foodItemId as string))
    );
    if (needKind.length > 0) {
      const mappings = await db.read<{ foodItemId?: unknown; mappingType?: string; day?: string }>('categoryfoodmapping', {
        foodItemId: { $in: needKind.map((id) => new ObjectId(id)) },
      } as never);
      if (!mappings.success || !mappings.data) {
        console.error('findClosedLines: could not read categoryfoodmapping:', mappings.error);
        return [];
      }
      for (const m of mappings.data) {
        const id = String((m.foodItemId as { toString(): string } | undefined)?.toString?.() ?? m.foodItemId);
        if (m.mappingType === 'DAY_WISE') {
          if (m.day) {
            const days = dayWiseDates.get(id) ?? new Set<string>();
            days.add(m.day.trim());
            dayWiseDates.set(id, days);
          }
        } else {
          flatItems.add(id);
        }
      }
    }
  } catch (error) {
    console.error('findClosedLines failed:', error);
    return [];
  }

  const closed: ClosedLine[] = [];
  for (const line of checked) {
    let kinds: ItemKind[];
    if (line.kind) {
      kinds = [line.kind];
    } else {
      // not told how it was added: an item listed day-wise for that date follows the day-wise (earlier) cutoff, even
      // when it is also a flat item, so Food Menu items cannot be ordered past their cutoff through the flat listing
      if (line.foodItemId && dayWiseDates.get(line.foodItemId)?.has(line.date)) kinds = ['day-wise'];
      else if (line.foodItemId && flatItems.has(line.foodItemId)) kinds = ['flat'];
      else kinds = ['day-wise'];
    }
    const doc = docs.get(line.date);
    const kind = kinds[0];
    // a kind an admin switched off for the date cannot be ordered at all (only judged when the date's settings exist)
    const switchedOff = (k: ItemKind) => !!doc && !(k === 'flat' ? doc.flatCategoryEnabled : doc.dayWiseCategoryEnabled);
    if (kinds.every(switchedOff)) {
      closed.push({ date: line.date, foodItemId: line.foodItemId, kind, closesAt: new Date().toISOString(), name: line.name, reason: 'disabled' });
      continue;
    }
    const isClosed = (k: ItemKind) => switchedOff(k) || isDateDisabled(line.date, overrideFor(doc, k) as Date | string | null | undefined, k);
    if (!kinds.every(isClosed)) continue;
    closed.push({
      date: line.date,
      foodItemId: line.foodItemId,
      kind,
      closesAt: cutoffInfo(line.date, overrideFor(doc, kind), kind).closesAt.toISOString(),
      name: line.name,
    });
  }
  return closed;
}

export { ITEM_KINDS };

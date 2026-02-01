import { NextResponse } from 'next/server';
import {
  getAvailableDatesFromDatabase,
  generateAvailableDateOptions,
} from '@/lib/server/availableDates';

/**
 * GET /api/available-dates
 *
 * Public API endpoint to fetch available calendar dates with flatCategoryEnabled filtering.
 * No authentication required.
 *
 * Query Parameters:
 * - startDate (optional): Start date in YYYY-MM-DD format (defaults to today)
 * - endDate (optional): End date in YYYY-MM-DD format (defaults to 60 days from start)
 *
 * Default Behavior:
 * - If no dates provided, returns available dates from today to 60 days in the future
 * - Filters for flatCategoryEnabled: true only
 * - Returns dates sorted in ascending order by date
 * - Includes cutoff time logic: A day is available until 1 PM PST the day before
 *   Example: Friday orders close at 1 PM PST on Thursday
 *
 * Response Format:
 * {
 *   success: boolean,
 *   dates: DateOption[]
 * }
 *
 * DateOption Structure:
 * {
 *   id: string,
 *   date: string (YYYY-MM-DD),
 *   flatCategoryEnabled: boolean,
 *   dayWiseCategoryEnabled: boolean,
 *   formattedDate: string (e.g., "Friday (Jan 15)"),
 *   fullDate: string,
 *   isToday: boolean,
 *   isPast: boolean,
 *   isPastCutoff: boolean
 * }
 *
 * Field Descriptions:
 * - isPast: The date itself has passed (e.g., it's currently Saturday, so Friday is in the past)
 * - isPastCutoff: The cutoff time has passed (1 PM PST the day before), even if the date hasn't
 *   Example: Thursday 2 PM PST - Friday hasn't happened yet but isPastCutoff=true
 *
 * A date is disabled for ordering if isPast=true OR isPastCutoff=true
 *
 * Error Handling:
 * - Logs errors to console
 * - Returns { success: false, dates: [] } with appropriate HTTP status code
 *
 * @example
 * // Fetch available dates for January 2025
 * GET /api/available-dates?startDate=2025-01-01&endDate=2025-01-31
 *
 * @example
 * // Fetch default range (today to 60 days)
 * GET /api/available-dates
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate date format if provided
    const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

    if (startDate && !dateRegex.test(startDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid startDate format. Use YYYY-MM-DD format.',
          dates: [],
        },
        { status: 400 }
      );
    }

    if (endDate && !dateRegex.test(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid endDate format. Use YYYY-MM-DD format.',
          dates: [],
        },
        { status: 400 }
      );
    }

    // Validate date range logic
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate must be before or equal to endDate',
          dates: [],
        },
        { status: 400 }
      );
    }

    // Fetch available dates from database
    const documents = await getAvailableDatesFromDatabase(startDate ?? undefined, endDate ?? undefined);

    // Convert to DateOption format
    const dates = generateAvailableDateOptions(documents, false);

    // Return success response
    return NextResponse.json({
      success: true,
      dates,
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error fetching available dates:', error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available dates',
        dates: [],
      },
      { status: 500 }
    );
  }
}

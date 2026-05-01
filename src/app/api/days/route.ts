import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';

/**
 * TypeScript interface for day configuration response
 */
export interface DayConfig {
  _id?: string;
  day: string;
  label: string;
  sequence: number;
  enabled: boolean;
}

/**
 * API Response interface
 */
interface DaysApiResponse {
  success: boolean;
  data?: DayConfig[];
  message?: string;
  error?: string;
}

/**
 * GET /api/days
 * Public endpoint - no authentication required
 * Fetches enabled days from the availableDays collection
 *
 * Returns days sorted by sequence in ascending order
 * Only includes days where enabled: true
 *
 * Response Structure:
 * {
 *   success: boolean,
 *   data: Array<{
 *     _id: string,
 *     day: string,        // Day name (e.g., "Monday", "Tuesday")
 *     label: string,       // Display label (e.g., "Mon", "Tue")
 *     sequence: number,    // Sort order
 *     enabled: boolean     // Always true for this endpoint
 *   }>,
 *   message?: string
 * }
 *
 * Error Handling:
 * - Database connection errors: Returns success: false, data: []
 * - No enabled days found: Returns success: true, data: []
 */
export async function GET(): Promise<Response> {
  try {
    // Fetch enabled days from availableDays collection
    const result = await db.read('availableDays', { enabled: true }, {
      sort: { sequence: 1 }
    });

    if (!result.success) {
      console.error('Database error fetching enabled days:', result.error);

      // Return graceful fallback on database errors
      return Response.json({
        success: true,
        data: [],
        message: 'Day configuration temporarily unavailable'
      } as DaysApiResponse, { status: 200 });
    }

    // Transform database documents to response format
    const days: DayConfig[] = [];

    if (result.data && Array.isArray(result.data)) {
      for (const dayData of result.data) {
        days.push({
          _id: dayData._id?.toString() || '',
          day: typeof dayData.day === 'string' ? dayData.day.trim() : '',
          label: typeof dayData.label === 'string' ? dayData.label.trim() : '',
          sequence: typeof dayData.sequence === 'number' ? dayData.sequence : 0,
          enabled: dayData.enabled === true
        });
      }
    }

    // Filter out any entries with empty day names and ensure all are enabled
    const filteredDays = days.filter(day =>
      day.day.length > 0 && day.enabled === true
    );

    return Response.json({
      success: true,
      data: filteredDays,
      message: `Retrieved ${filteredDays.length} enabled days`
    } as DaysApiResponse, { status: 200 });

  } catch (error) {
    console.error('Error in days API endpoint:', error);

    // Return graceful fallback on unexpected errors
    return Response.json({
      success: true,
      data: [],
      message: 'Unable to fetch day configuration'
    } as DaysApiResponse, { status: 200 });
  }
}
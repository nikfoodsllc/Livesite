import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

/**
 * GET /api/enabled-days
 *
 * @deprecated This endpoint is deprecated and will be removed in a future version.
 *             Please migrate to /api/available-dates endpoint instead.
 *             Migration path: Replace GET /api/enabled-days with GET /api/available-dates
 *             The new endpoint provides the same functionality with improved performance and consistency.
 *
 * Returns the list of enabled days from the database.
 * This endpoint is used by client-side code to fetch available days.
 */
export async function GET() {
  // Console warning for deprecation
  console.warn('[DEPRECATED] GET /api/enabled-days is deprecated. Please migrate to /api/available-dates endpoint.');

  try {
    const result = await db.read('availableDays', { enabled: true }, {
      sort: { sequence: 1 }
    });

    if (result.success && result.data && Array.isArray(result.data)) {
      const enabledDays = result.data
        .map((day: any) => {
          const dayName = typeof day.day === 'string' ? day.day.trim().toLowerCase() : '';
          return dayName;
        })
        .filter(Boolean);

      if (enabledDays.length > 0) {
        return NextResponse.json({
          success: true,
          days: enabledDays
        }, {
          headers: {
            'Deprecation': 'true'
          }
        });
      }
    }

    // Return empty array if no enabled days found
    return NextResponse.json({
      success: true,
      days: []
    }, {
      headers: {
        'Deprecation': 'true'
      }
    });
  } catch (error) {
    console.error('Error fetching enabled days:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch enabled days',
      days: []
    }, {
      status: 500,
      headers: {
        'Deprecation': 'true'
      }
    });
  }
}

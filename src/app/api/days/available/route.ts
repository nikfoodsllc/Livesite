import { NextResponse } from 'next/server';
import { generateAvailableDays } from '@/lib/server/dayAvailability';

/**
 * GET /api/days/available?includeDisabled=true|false
 *
 * @deprecated This endpoint is deprecated and will be removed in a future version.
 *             Please migrate to /api/available-dates endpoint instead.
 *             Migration path: Replace GET /api/days/available with GET /api/available-dates
 *             The new endpoint provides the same functionality with improved performance.
 *
 * Returns available day options for current week.
 * This endpoint is used by client-side code instead of importing generateAvailableDays directly.
 */
export async function GET(request: Request) {
  // Console warning for deprecation
  console.warn('[DEPRECATED] GET /api/days/available is deprecated. Please migrate to /api/available-dates endpoint.');

  try {
    const { searchParams } = new URL(request.url);
    const includeDisabled = searchParams.get('includeDisabled') === 'true';

    const days = await generateAvailableDays(includeDisabled);

    return NextResponse.json({
      success: true,
      days
    }, {
      headers: {
        'Deprecation': 'true'
      }
    });
  } catch (error) {
    console.error('Error generating available days:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate available days',
      days: []
    }, {
      status: 500,
      headers: {
        'Deprecation': 'true'
      }
    });
  }
}

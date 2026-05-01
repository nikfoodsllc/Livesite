import { NextResponse } from 'next/server';
import { getDayOption } from '@/lib/server/dayAvailability';

/**
 * GET /api/days/option?dayName=Monday
 *
 * Returns day option for a specific day name.
 * This endpoint is used by client-side code instead of importing getDayOption directly.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dayName = searchParams.get('dayName');

    if (!dayName) {
      return NextResponse.json({
        success: false,
        error: 'dayName parameter is required',
        dayOption: null
      }, { status: 400 });
    }

    const dayOption = await getDayOption(dayName as any);

    return NextResponse.json({
      success: true,
      dayOption
    });
  } catch (error) {
    console.error('Error getting day option:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get day option',
      dayOption: null
    }, { status: 500 });
  }
}

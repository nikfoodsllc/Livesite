import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { MenuSubscription } from '@/types/subscription';

/**
 * GET /api/menu-subscriptions/check?email=user@example.com
 * Check if an email is already subscribed
 */
export async function GET(request: NextRequest) {
  try {
    // Get email from query parameters
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        {
          subscribed: false,
          email: '',
          error: 'Email parameter is required',
        },
        { status: 400 }
      );
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email exists in database
    const result = await db.readOne<MenuSubscription>(
      'menu_subscriptions',
      { email: normalizedEmail, isActive: true }
    );

    if (result.success && result.data) {
      return NextResponse.json(
        {
          subscribed: true,
          email: normalizedEmail,
          subscribedAt: result.data.subscribedAt,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        subscribed: false,
        email: normalizedEmail,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in subscription check API:', error);
    return NextResponse.json(
      {
        subscribed: false,
        email: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

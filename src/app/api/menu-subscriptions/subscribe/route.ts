import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { subscribeSchema } from '@/lib/validations/subscription';
import { SubscribeRequest, MenuSubscription } from '@/types/subscription';

/**
 * POST /api/menu-subscriptions/subscribe
 * Subscribe an email to menu update notifications
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json() as SubscribeRequest;

    // Validate input
    const validationResult = subscribeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          error: validationResult.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { email, consentGiven } = validationResult.data;

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingSubscription = await db.readOne<MenuSubscription>(
      'menu_subscriptions',
      { email: normalizedEmail, isActive: true }
    );

    if (existingSubscription.success && existingSubscription.data) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email is already subscribed',
          error: 'This email address is already subscribed to menu notifications',
        },
        { status: 409 }
      );
    }

    // Get user ID from authorization header if available
    const authHeader = request.headers.get('authorization');
    let userId: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        // Simple JWT decode to get user ID (you may want to use a proper JWT library)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.userId || payload.sub;
      } catch (error) {
        // Invalid token, proceed as guest
        console.warn('Invalid auth token, proceeding as guest');
      }
    }

    // Create subscription
    const now = new Date();
    const subscriptionData: Omit<MenuSubscription, '_id'> = {
      email: normalizedEmail,
      userId,
      subscribedAt: now,
      consentGiven,
      isActive: true,
      source: 'home_modal',
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.create<MenuSubscription>(
      'menu_subscriptions',
      subscriptionData
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create subscription',
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to menu notifications',
        data: {
          email: normalizedEmail,
          subscribedAt: now,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in subscription API:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

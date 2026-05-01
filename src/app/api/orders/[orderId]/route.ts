import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { Order } from '@/types/order';
import { formatAPIDate } from '@/lib/apiDateFormat';

/**
 * GET /api/orders/[orderId]
 * Retrieves order details by order ID
 *
 * Date Format Standard:
 * - All timestamp fields (createdAt, updatedAt) are returned in ISO 8601 format
 * - NextResponse.json() automatically handles Date serialization to ISO strings
 * - Delivery dates in items array remain as YYYY-MM-DD format strings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Validate orderId parameter
    if (!orderId) {
      console.error('[GET /api/orders] Missing orderId parameter');
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Validate orderId format - should be a string with reasonable length
    if (typeof orderId !== 'string' || orderId.trim().length === 0) {
      console.error('[GET /api/orders] Invalid orderId format:', typeof orderId);
      return NextResponse.json(
        { success: false, error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    // Clean and validate orderId
    const cleanOrderId = orderId.trim();
    if (cleanOrderId.length < 8 || cleanOrderId.length > 50) {
      console.error('[GET /api/orders] Invalid orderId length:', cleanOrderId.length);
      return NextResponse.json(
        { success: false, error: 'Order ID format is invalid' },
        { status: 400 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('[GET /api/orders] Missing authorization header');
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in to access your orders.' },
        { status: 401 }
      );
    }

    // Extract and validate token
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      console.error('[GET /api/orders] Invalid authorization header format');
      return NextResponse.json(
        { success: false, error: 'Invalid authentication format. Please log in again.' },
        { status: 401 }
      );
    }

    const token = tokenMatch[1];
    if (!token || token.length < 10) {
      console.error('[GET /api/orders] Invalid token length');
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token. Please log in again.' },
        { status: 401 }
      );
    }

    const verifyResult = jwtHandler.verifyToken(token);

    if (!verifyResult.success || !verifyResult.payload) {
      console.error('[GET /api/orders] Token verification failed:', verifyResult.error);
      return NextResponse.json(
        {
          success: false,
          error: verifyResult.error || 'Your session has expired. Please log in again.'
        },
        { status: 401 }
      );
    }

    const userId = verifyResult.payload.userId;
    if (!userId) {
      console.error('[GET /api/orders] No userId in token payload');
      return NextResponse.json(
        { success: false, error: 'Invalid user session. Please log in again.' },
        { status: 401 }
      );
    }

    console.log(`[GET /api/orders/${cleanOrderId}] userId from JWT:`, userId);

    // Find order by orderId
    const result = await db.readOne<Order>('orders', { orderId: cleanOrderId });

    console.log(`[GET /api/orders/${cleanOrderId}] DB query result:`, result.success);

    if (!result.success) {
      console.error(`[GET /api/orders/${cleanOrderId}] Database query failed:`, result.error);
      return NextResponse.json(
        { success: false, error: 'Database error. Please try again later.' },
        { status: 500 }
      );
    }

    if (!result.data) {
      console.log(`[GET /api/orders/${cleanOrderId}] Order not found in database`);
      return NextResponse.json(
        { success: false, error: `Order #${cleanOrderId} not found. Please verify the order ID from your confirmation email.` },
        { status: 404 }
      );
    }

    const order = result.data;

    console.log(`[GET /api/orders/${cleanOrderId}] Order found, user field:`, order.user, 'type:', typeof order.user);
    console.log(`[GET /api/orders/${cleanOrderId}] Comparing ${order.user?.toString()} === ${userId}`);

    // Verify order belongs to the authenticated user
    const orderUserId = order.user?.toString();
    if (orderUserId !== userId) {
      console.log(`[GET /api/orders/${cleanOrderId}] Authorization failed - user mismatch: ${orderUserId} !== ${userId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to view this order. Please check your account or contact support.'
        },
        { status: 403 }
      );
    }

    // Validate order data structure
    if (!order.orderId || !order.items || !Array.isArray(order.items)) {
      console.error(`[GET /api/orders/${cleanOrderId}] Invalid order data structure`);
      return NextResponse.json(
        { success: false, error: 'Order data is corrupted. Please contact support.' },
        { status: 500 }
      );
    }

    console.log(`[GET /api/orders/${cleanOrderId}] Authorization successful, returning order`);

    // Ensure Date objects are properly set for JSON serialization
    // NextResponse.json() will automatically serialize Date objects to ISO 8601 strings
    const orderWithDates = {
      ...order,
      // Ensure timestamp fields are Date objects if they exist
      createdAt: order.createdAt ? new Date(order.createdAt) : undefined,
      updatedAt: order.updatedAt ? new Date(order.updatedAt) : undefined,
    };

    return NextResponse.json({
      success: true,
      data: orderWithDates,
    });
  } catch (error) {
    console.error('[GET /api/orders] Unexpected error:', error);

    // Don't expose internal error details to client
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        success: false,
        error: isDev
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'An unexpected error occurred. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { Order } from '@/types/order';
import { formatAPIDate } from '@/lib/apiDateFormat';

/**
 * GET /api/orders
 * Retrieves paginated list of user's orders with optional filtering
 *
 * Date Format Standard:
 * - All timestamp fields (createdAt, updatedAt) are returned in ISO 8601 format
 * - NextResponse.json() automatically handles Date serialization to ISO strings
 * - Delivery dates in items array remain as YYYY-MM-DD format strings
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const verifyResult = jwtHandler.verifyToken(token);

    if (!verifyResult.success || !verifyResult.payload) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = verifyResult.payload.userId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const statusFilter = searchParams.get('status') || 'all';

    // Build query filter
    const filter: Record<string, unknown> = { user: userId };

    // Apply status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'active':
          filter.status = {
            $in: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'],
          };
          break;
        case 'delivered':
          filter.status = 'delivered';
          break;
        case 'cancelled':
          filter.status = 'cancelled';
          break;
      }
    }

    // Get total count for pagination
    const totalResult = await db.count('orders', filter);
    if (!totalResult.success) {
      console.error('[GET /api/orders] Failed to count orders:', totalResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve orders' },
        { status: 500 }
      );
    }

    const total = totalResult.count || 0;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Fetch orders with pagination, sorted by created date (newest first)
    const ordersResult = await db.read('orders', filter, {
      sort: { createdAt: -1 },
      skip,
      limit,
    });

    if (!ordersResult.success || !ordersResult.data) {
      console.error('[GET /api/orders] Failed to fetch orders:', ordersResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve orders' },
        { status: 500 }
      );
    }

    const orders = ordersResult.data as Order[];

    // Ensure Date objects are properly set for serialization
    // NextResponse.json() will automatically serialize Date objects to ISO 8601 strings
    const ordersWithDates = orders.map((order) => ({
      ...order,
      // Ensure timestamp fields are Date objects if they exist
      createdAt: order.createdAt ? new Date(order.createdAt) : undefined,
      updatedAt: order.updatedAt ? new Date(order.updatedAt) : undefined,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items: ordersWithDates,
        page,
        pageSize: limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('[GET /api/orders] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

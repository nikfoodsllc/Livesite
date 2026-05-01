import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { Order, OrderStatus } from '@/types/order';
import { formatAPIDate } from '@/lib/apiDateFormat';

export interface TrackingStep {
  status: OrderStatus;
  label: string;
  timestamp?: Date | string;
  completed: boolean;
  active: boolean;
}

/**
 * GET /api/orders/[orderId]/track
 * Returns order tracking information with timeline
 *
 * Date Format Standard:
 * - All timestamp fields (createdAt, updatedAt, timestamp) are returned in ISO 8601 format
 * - NextResponse.json() automatically handles Date serialization to ISO strings
 * - Delivery dates remain as YYYY-MM-DD format strings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
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
    const { orderId } = await params;

    // Fetch order from database
    const orderResult = await db.readOne('orders', { orderId, user: userId });

    if (!orderResult.success || !orderResult.data) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.data as Order;

    // Build tracking timeline
    const statusOrder: OrderStatus[] = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
    ];

    const currentStatusIndex = statusOrder.indexOf(order.status);
    const isCancelled = order.status === 'cancelled';

    const timeline: TrackingStep[] = statusOrder.map((status, index) => ({
      status,
      label: getStatusLabel(status),
      completed: !isCancelled && index <= currentStatusIndex,
      active: !isCancelled && index === currentStatusIndex,
    }));

    // If cancelled, create special cancelled timeline
    if (isCancelled) {
      return NextResponse.json({
        success: true,
        data: {
          order: {
            orderId: order.orderId,
            status: order.status,
            // Ensure Date objects are properly set for ISO 8601 serialization
            createdAt: order.createdAt ? new Date(order.createdAt) : undefined,
            updatedAt: order.updatedAt ? new Date(order.updatedAt) : undefined,
          },
          timeline: [
            {
              status: 'cancelled',
              label: 'Order Cancelled',
              // Ensure timestamp is a Date object for ISO 8601 serialization
              timestamp: order.updatedAt ? new Date(order.updatedAt) : undefined,
              completed: true,
              active: true,
            },
          ],
          isCancelled: true,
          estimatedDelivery: null,
        },
      });
    }

    // Calculate estimated delivery (first delivery date from order items)
    const firstDeliveryDate = order.items[0]?.deliveryDate;

    return NextResponse.json({
      success: true,
      data: {
        order: {
          orderId: order.orderId,
          status: order.status,
          // Ensure Date objects are properly set for ISO 8601 serialization
          createdAt: order.createdAt ? new Date(order.createdAt) : undefined,
          updatedAt: order.updatedAt ? new Date(order.updatedAt) : undefined,
        },
        timeline,
        isCancelled: false,
        estimatedDelivery: firstDeliveryDate,
      },
    });
  } catch (error) {
    console.error('[GET /api/orders/[orderId]/track] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Order Placed',
    confirmed: 'Order Confirmed',
    preparing: 'Preparing Your Food',
    ready: 'Ready for Pickup',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

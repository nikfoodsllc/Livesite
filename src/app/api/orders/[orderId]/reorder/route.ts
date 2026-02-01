import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { Order } from '@/types/order';

/**
 * POST /api/orders/[orderId]/reorder
 * Returns order data formatted for adding to cart
 */
export async function POST(
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

    // Check if order can be reordered (only delivered orders)
    if (order.status !== 'delivered') {
      return NextResponse.json(
        { success: false, error: 'Only delivered orders can be reordered' },
        { status: 400 }
      );
    }

    // Format order items for cart addition
    // The frontend will handle adding these items to the cart
    const reorderData = {
      orderId: order.orderId,
      items: order.items.map((dayOrder) => ({
        day: dayOrder.day,
        items: dayOrder.items.map((item) => ({
          foodItemId: item.food._id,
          foodItemName: item.food.name,
          quantity: item.quantity,
          price: item.price,
          spiceLevel: item.spiceLevel,
          portions: item.portions,
          comboSelections: item.comboSelections,
        })),
      })),
      totalItems: order.items.reduce(
        (total, day) => total + day.items.reduce((dayTotal, item) => dayTotal + item.quantity, 0),
        0
      ),
    };

    return NextResponse.json({
      success: true,
      data: reorderData,
      message: 'Order items ready to be added to cart',
    });
  } catch (error) {
    console.error('[POST /api/orders/[orderId]/reorder] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

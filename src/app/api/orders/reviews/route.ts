import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { Order, OrderReview } from '@/types/order';

interface SubmitReviewRequest {
  orderId: string;
  rating: number;
  comment?: string;
}

/**
 * POST /api/orders/reviews
 * Submit a review for a delivered order
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: SubmitReviewRequest = await request.json();
    const { orderId, rating, comment } = body;

    // Validate required fields
    if (!orderId || !rating) {
      return NextResponse.json(
        { success: false, error: 'Order ID and rating are required' },
        { status: 400 }
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Fetch order to verify it exists and belongs to user
    const orderResult = await db.readOne('orders', { orderId, user: userId });

    if (!orderResult.success || !orderResult.data) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.data as Order;

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return NextResponse.json(
        { success: false, error: 'Only delivered orders can be reviewed' },
        { status: 400 }
      );
    }

    // Check if order already has a review
    const existingReviewResult = await db.readOne('orderReviews', { orderId, user: userId });
    if (existingReviewResult.success && existingReviewResult.data) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this order' },
        { status: 400 }
      );
    }

    // Create review
    const review: Omit<OrderReview, '_id'> = {
      orderId,
      user: userId,
      rating,
      comment: comment || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const reviewResult = await db.create('orderReviews', review);

    if (!reviewResult.success) {
      console.error('[POST /api/orders/reviews] Failed to create review:', reviewResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to submit review' },
        { status: 500 }
      );
    }

    // Update order to mark as reviewed
    const updateResult = await db.updateOne(
      'orders',
      { orderId, user: userId },
      { hasReview: true, updatedAt: new Date() }
    );

    if (!updateResult.success) {
      console.error('[POST /api/orders/reviews] Failed to update order:', updateResult.error);
      // Review was created, but order update failed - log but don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        orderId,
        rating,
        comment,
      },
    });
  } catch (error) {
    console.error('[POST /api/orders/reviews] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

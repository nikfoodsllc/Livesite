import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';

/**
 * GET /api/checkout/payment-order?paymentIntentId=pi_...
 * Tells the checkout return page which order a Stripe payment belongs to. Stripe never gives
 * payment metadata to the browser, so the page cannot read the order number from the payment.
 * Only the customer who owns the order gets an answer.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const verifyResult = jwtHandler.verifyToken(authHeader.replace('Bearer ', ''));
    if (!verifyResult.success || !verifyResult.payload) {
      return NextResponse.json({ success: false, error: 'Invalid authentication token' }, { status: 401 });
    }

    const paymentIntentId = request.nextUrl.searchParams.get('paymentIntentId') ?? '';
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return NextResponse.json({ success: false, error: 'Invalid payment id' }, { status: 400 });
    }

    const result = await db.readOne<{ orderId: string; user?: string; paymentStatus: string }>('orders', {
      stripePaymentIntentId: paymentIntentId,
    });

    // Same answer for "no such order" and "someone else's order", so ids can't be probed
    if (!result.success || !result.data || result.data.user !== verifyResult.payload.userId) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { orderId: result.data.orderId, paymentStatus: result.data.paymentStatus },
    });
  } catch (error) {
    console.error('[payment-order] Lookup failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 500 });
  }
}

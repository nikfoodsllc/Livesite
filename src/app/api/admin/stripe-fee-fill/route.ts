import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/server/db';
import { requireAdmin } from '@/lib/adminAuth';
import { fetchPaymentIntentFee } from '@/lib/server/stripeFee';
import { Order } from '@/types/order';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecretKey || 'sk_test_dummy_key_for_build', {
  apiVersion: '2025-10-29.clover',
});

const MAX_ORDERS = 10;

/**
 * POST /api/admin/stripe-fee-fill   { "orderIds": ["ORD-..."] }   (admin login required)
 *
 * Fills in Stripe's fee on paid orders that missed it when the payment came in. It only READS from
 * Stripe and only writes stripeFee / stripeNet, and only on orders that have no fee yet, so running it
 * twice changes nothing. The answer lists, per order, what happened (no customer details).
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  if (!stripeSecretKey) {
    return NextResponse.json({ success: false, error: 'Stripe is not configured' }, { status: 500 });
  }

  let body: { orderIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const orderIds = body.orderIds;
  if (
    !Array.isArray(orderIds) ||
    orderIds.length === 0 ||
    orderIds.length > MAX_ORDERS ||
    !orderIds.every((id) => typeof id === 'string' && /^ORD-\d+$/.test(id))
  ) {
    return NextResponse.json(
      { success: false, error: `orderIds must be 1-${MAX_ORDERS} order ids like "ORD-123"` },
      { status: 400 }
    );
  }

  const results: Array<{ orderId: string; result: string; stripeFee?: number; stripeNet?: number }> = [];
  for (const orderId of orderIds as string[]) {
    const read = await db.readOne<Order>('orders', { orderId });
    const order = read.success ? read.data : null;
    if (!order) {
      results.push({ orderId, result: 'order not found' });
      continue;
    }
    if (order.stripeFee !== undefined && order.stripeFee !== null) {
      results.push({ orderId, result: 'already has a fee', stripeFee: order.stripeFee });
      continue;
    }
    if (order.paymentStatus !== 'paid' || !order.stripePaymentIntentId) {
      results.push({ orderId, result: 'not a paid Stripe order' });
      continue;
    }
    const fee = await fetchPaymentIntentFee(stripe, order.stripePaymentIntentId);
    if (!fee) {
      results.push({ orderId, result: 'Stripe has no fee for this payment yet' });
      continue;
    }
    // Only when the order still has no fee, so a fee saved meanwhile is never overwritten
    const write = await db.updateOne(
      'orders',
      { orderId, stripeFee: { $exists: false } },
      { $set: fee }
    );
    if (!write.success) results.push({ orderId, result: 'could not save the fee' });
    else if (!write.modifiedCount) results.push({ orderId, result: 'already has a fee' });
    else results.push({ orderId, result: 'filled', ...fee });
  }

  return NextResponse.json({ success: true, results });
}

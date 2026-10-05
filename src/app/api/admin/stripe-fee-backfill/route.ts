import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { db } from '@/lib/server/db';
import { requireAdmin } from '@/lib/adminAuth';
import { planFeeBackfill, type BackfillSkipReason } from '@/lib/server/stripeFeeBackfill';

// One batch can make up to 100 Stripe calls
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build', {
  maxNetworkRetries: 2,
});

interface OrderRow {
  _id: ObjectId;
  orderId: string;
  totalPaid: number;
  stripePaymentIntentId?: string;
  paymentIntentId?: string;
}

const CONCURRENCY = 6;

/**
 * POST /api/admin/stripe-fee-backfill   (admins only)
 *
 * Saves Stripe's processing fee (stripeFee / stripeNet) on paid or refunded orders that were placed before
 * the fee was saved at payment time. One batch per call; call again with `afterId` = the `lastId` of the
 * previous reply until `done` is true.
 *
 *   body: { dryRun?: boolean (default true: reads Stripe, writes nothing), limit?: 1-100 (default 40), afterId?: string }
 *
 * Safe to repeat: only orders without a stripeFee are looked at, an existing fee is never overwritten, and
 * an order is only updated when its payment, order number and amount all match Stripe's records. It does
 * not send any email. The reply has counts and a few examples, no customer details.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;
    const limit = Math.min(100, Math.max(1, Number.isInteger(body.limit) ? body.limit : 40));
    let afterId: ObjectId | null = null;
    if (body.afterId !== undefined && body.afterId !== null && body.afterId !== '') {
      if (typeof body.afterId !== 'string' || !ObjectId.isValid(body.afterId)) {
        return NextResponse.json({ success: false, error: 'afterId is not a valid id' }, { status: 400 });
      }
      afterId = new ObjectId(body.afterId);
    }

    const query: Record<string, unknown> = {
      paymentStatus: { $in: ['paid', 'refunded'] },
      stripeFee: { $exists: false },
      $or: [{ stripePaymentIntentId: { $exists: true, $ne: null } }, { paymentIntentId: { $exists: true, $ne: null } }],
    };
    if (afterId) query._id = { $gt: afterId };

    const read = await db.read<OrderRow>('orders', query, {
      sort: { _id: 1 },
      limit,
      projection: { orderId: 1, totalPaid: 1, stripePaymentIntentId: 1, paymentIntentId: 1 },
    });
    if (!read.success || !read.data) {
      return NextResponse.json({ success: false, error: 'Could not read orders' }, { status: 500 });
    }
    const orders = read.data;

    const skipped: Partial<Record<BackfillSkipReason, number>> = {};
    const samples: Array<{ orderId: string; totalPaid: number; stripeFee: number; stripeNet: number; formulaFee: number }> = [];
    let updated = 0;
    let writeErrors = 0;
    let totalFee = 0;
    let totalGross = 0;
    const skip = (reason: BackfillSkipReason) => {
      skipped[reason] = (skipped[reason] ?? 0) + 1;
    };

    const handle = async (order: OrderRow) => {
      const intentId = order.stripePaymentIntentId || order.paymentIntentId;
      if (!intentId) return skip('no_payment_intent');
      let intent: Stripe.PaymentIntent;
      try {
        intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge.balance_transaction'] });
      } catch (error) {
        const code = (error as { code?: string }).code;
        return skip(code === 'resource_missing' ? 'not_in_this_stripe_account' : 'stripe_error');
      }
      const decision = planFeeBackfill(order, intent);
      if (decision.action === 'skip') return skip(decision.reason);

      totalFee += decision.stripeFee;
      totalGross += order.totalPaid;
      if (samples.length < 5) {
        samples.push({
          orderId: order.orderId,
          totalPaid: order.totalPaid,
          stripeFee: decision.stripeFee,
          stripeNet: decision.stripeNet,
          formulaFee: Math.round((order.totalPaid * 0.029 + 0.3) * 100) / 100,
        });
      }
      if (dryRun) {
        updated++;
        return;
      }
      // never overwrite: the filter again requires "no stripeFee yet"
      const result = await db.updateOne<OrderRow>(
        'orders',
        { _id: order._id, stripeFee: { $exists: false } } as never,
        { $set: { stripeFee: decision.stripeFee, stripeNet: decision.stripeNet } } as never
      );
      if (!result.success) writeErrors++;
      else if (result.modifiedCount) updated++;
    };

    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, orders.length) }, async () => {
        while (next < orders.length) {
          const order = orders[next++];
          await handle(order);
        }
      })
    );

    const last = orders.length ? orders[orders.length - 1]._id.toString() : null;
    return NextResponse.json({
      success: true,
      dryRun,
      scanned: orders.length,
      [dryRun ? 'wouldUpdate' : 'updated']: updated,
      writeErrors,
      skipped,
      totalFee: Math.round(totalFee * 100) / 100,
      totalPaidOfUpdated: Math.round(totalGross * 100) / 100,
      samples,
      lastId: last,
      done: orders.length < limit,
    });
  } catch (error) {
    console.error('[stripe-fee-backfill] Unexpected error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 });
  }
}

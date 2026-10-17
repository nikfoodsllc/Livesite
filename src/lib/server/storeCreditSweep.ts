import Stripe from 'stripe';
import { db } from '@/lib/server/db';
import { restoreOrderCredit, sweepCancelledOrderCredit } from '@/lib/server/storeCredit';
import { giveBackLinkOrderCredit } from '@/lib/server/linkOrderCredit';

/** An order that was started but never paid keeps its store credit this long before it is given back. */
export const PENDING_CREDIT_HOLD_MS = 3 * 60 * 60 * 1000;

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-10-29.clover' });
}

/**
 * Credit held for an order that was started but never paid (the customer closed the page) would stay locked. After 3 hours
 * the card payment is closed in Stripe; the "payment cancelled" webhook then cancels the order and hands the credit back.
 * A payment that already went through (or is still processing) is left alone. An order with no card payment gives its credit
 * back directly.
 */
export async function releaseStalePendingCredit(now: Date = new Date(), limit = 50): Promise<{ checked: number; closed: number; restored: number }> {
  const staleBefore = new Date(now.getTime() - PENDING_CREDIT_HOLD_MS);
  const found = await db.read<{ orderId: string; stripePaymentIntentId?: string }>(
    'orders',
    { status: 'pending', paymentStatus: 'unpaid', source: { $ne: 'admin' }, storeCreditState: 'held', storeCreditUsed: { $gt: 0 }, createdAt: { $lt: staleBefore } } as never,
    { limit, projection: { orderId: 1, stripePaymentIntentId: 1 } }
  );
  const rows = found.success && found.data ? found.data : [];
  const stripe = stripeClient();
  let closed = 0;
  let restored = 0;
  for (const row of rows) {
    try {
      if (row.stripePaymentIntentId && stripe) {
        const pi = await stripe.paymentIntents.retrieve(row.stripePaymentIntentId);
        if (pi.status === 'succeeded' || pi.status === 'processing') continue;
        if (pi.status !== 'canceled') await stripe.paymentIntents.cancel(pi.id);
        closed += 1;
        // the cancel webhook gives the credit back; if it never arrives the next run's order sweep still does
        continue;
      }
      if (!row.stripePaymentIntentId) {
        await db.updateOne('orders', { orderId: row.orderId, paymentStatus: 'unpaid' } as never, { $set: { status: 'cancelled', paymentStatus: 'failed', updatedAt: new Date() } } as never);
        if ((await restoreOrderCredit(row.orderId, 'The order was never paid')) > 0) restored += 1;
      }
    } catch (error) {
      console.error('[store-credit] could not release stale credit', { orderId: row.orderId, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { checked: rows.length, closed, restored };
}

/**
 * Credit a customer applied on a pay page and then left: an order an admin entered legitimately waits days for payment, so
 * the order stays; only the credit goes back (3 hours after it was applied) and the card payment returns to the full total.
 */
export async function releaseStaleLinkOrderCredit(now: Date = new Date(), limit = 50): Promise<{ checked: number; released: number }> {
  const staleBefore = new Date(now.getTime() - PENDING_CREDIT_HOLD_MS);
  const found = await db.read<{ orderId: string }>(
    'orders',
    { source: 'admin', status: { $ne: 'cancelled' }, paymentStatus: 'unpaid', storeCreditState: 'held', storeCreditUsed: { $gt: 0 }, storeCreditHeldAt: { $lt: staleBefore } } as never,
    { limit, projection: { orderId: 1 } }
  );
  const rows = found.success && found.data ? found.data : [];
  let released = 0;
  for (const row of rows) {
    try {
      if ((await giveBackLinkOrderCredit(row.orderId, 'The credit was not used within 3 hours')) > 0) released += 1;
    } catch (error) {
      console.error('[store-credit] could not release stale link order credit', { orderId: row.orderId, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { checked: rows.length, released };
}

export async function runCreditSweeps(): Promise<{ cancelled: { checked: number; restored: number }; pending: { checked: number; closed: number; restored: number }; links: { checked: number; released: number } }> {
  const pending = await releaseStalePendingCredit();
  const links = await releaseStaleLinkOrderCredit();
  const cancelled = await sweepCancelledOrderCredit();
  return { cancelled, pending, links };
}

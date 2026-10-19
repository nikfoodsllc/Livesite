import Stripe from 'stripe';
import { db } from '@/lib/server/db';
import { pacificToday, releaseOrder } from '@/lib/server/optimoRoute/sync';
import { isQuoteOrder } from '@/lib/quoteOrder';
import type { Order } from '@/types/order';

export type DeleteResult = { ok: true; paidByCard: boolean; optimoRemoved: number } | { ok: false; status: number; error: string };

const fail = (status: number, error: string): DeleteResult => ({ ok: false, status, error });

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-10-29.clover' });
}

/**
 * Deletes an order completely (admin only, any order). Order of work, so that a failure never leaves a half-deleted order:
 * 1. an unpaid card payment is closed in Stripe (a payment the customer already made is never touched: refunds stay in Stripe),
 * 2. the order's stops come off the OptimoRoute plan (a stop with no other live order is removed there),
 * 3. a copy of the order is kept in `deletedOrders` (who and when), so a wrong delete can be restored by hand,
 * 4. the order is removed.
 */
export async function deleteOrderAsAdmin(orderId: string, adminId: string): Promise<DeleteResult> {
  const found = await db.readOne<Order>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order) return fail(404, 'No order with that number');

  const paid = order.paymentStatus === 'paid' || order.paymentStatus === 'refunded';
  const paidByCard = Boolean(order.stripePaymentIntentId) && order.paymentStatus === 'paid';

  if (order.stripePaymentIntentId && !paid) {
    const stripe = stripeClient();
    if (!stripe) return fail(500, 'Stripe is not configured on the site');
    try {
      const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      if (pi.status === 'succeeded' || pi.status === 'processing') return fail(409, 'The customer has just paid by card, so the order was not deleted. Reload the list and refund it in Stripe if needed.');
      if (pi.status !== 'canceled') await stripe.paymentIntents.cancel(pi.id);
    } catch (error) {
      console.error('[order-delete] could not close the Stripe payment', { orderId, message: error instanceof Error ? error.message : String(error) });
      return fail(502, 'Could not close the card payment with Stripe. Nothing was deleted. Try again in a moment.');
    }
  }

  let optimoRemoved = 0;
  try {
    // a quote order is taken off OptimoRoute whenever it is deleted, also after its day went by (even when it was delivered)
    const released = await releaseOrder(orderId, { includePast: isQuoteOrder(order) });
    // a stop of a day that has not gone by must come off before the order goes; one of a past day that OptimoRoute refuses to delete is only logged
    const today = pacificToday();
    const stuck = released.outcomes.filter((o) => o.result === 'remove_failed' && o.date >= today);
    const stuckPast = released.outcomes.filter((o) => o.result === 'remove_failed' && o.date < today);
    if (stuckPast.length > 0) console.warn('[order-delete] OptimoRoute would not delete the stop of a past day', { orderId, days: stuckPast.map((o) => o.date) });
    if (stuck.length > 0) return fail(502, 'Could not remove the delivery stop from OptimoRoute. Nothing was deleted. Try again in a moment.');
    optimoRemoved = released.outcomes.filter((o) => o.result === 'removed').length;
  } catch (error) {
    console.error('[order-delete] OptimoRoute release failed', { orderId, message: error instanceof Error ? error.message : String(error) });
    return fail(502, 'Could not update OptimoRoute. Nothing was deleted. Try again in a moment.');
  }

  const archived = await db.create('deletedOrders', { orderId, deletedAt: new Date(), deletedBy: adminId, order } as never);
  if (!archived.success) return fail(500, 'Could not keep a copy of the order, so nothing was deleted. Try again.');

  const removed = await db.deleteOne('orders', { orderId } as never);
  if (!removed.success) return fail(500, 'The order could not be deleted. Try again.');
  if (!removed.deletedCount) return fail(404, 'The order was already deleted');

  console.log('[order-delete] deleted', { orderId, by: adminId, paidByCard, optimoRemoved });
  return { ok: true, paidByCard, optimoRemoved };
}

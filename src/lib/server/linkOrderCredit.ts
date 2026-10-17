import Stripe from 'stripe';
import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { planCreditUse, toCents, toDollars } from '@/lib/storeCredit';
import { addCredit, getBalanceCents, restoreOrderCredit, spendCredit } from '@/lib/server/storeCredit';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { syncOrderSafely } from '@/lib/server/optimoRoute/sync';

/**
 * Store credit on the pay page of an order an admin entered (a payment-link order).
 * The customer can apply their credit there; like at checkout it is taken off the balance at once ('held'), the card
 * payment shrinks to what is left, and if the credit covers everything the customer presses "pay with store credit".
 * The credit goes back when the customer switches it off, the admin cancels the order or marks it paid another way,
 * or the customer leaves it applied for 3 hours without paying.
 */
export type LinkCreditResult =
  | { ok: true; used: number; covered: boolean }
  | { ok: false; status: number; error: string };

const fail = (status: number, error: string): LinkCreditResult => ({ ok: false, status, error });

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key, { apiVersion: '2025-10-29.clover' }) : null;
}

async function loadOpenLinkOrder(orderId: string): Promise<{ order: Order } | { error: LinkCreditResult }> {
  const found = await db.readOne<Order>('orders', { orderId, source: 'admin' } as never);
  const order = found.success ? found.data : null;
  if (!order) return { error: fail(404, 'This payment link is not valid.') };
  if (order.paymentStatus === 'paid' || order.status === 'cancelled' || order.paymentStatus === 'refunded' || !order.stripePaymentIntentId) {
    return { error: fail(409, 'This order can no longer be changed.') };
  }
  if (!order.user) return { error: fail(409, 'There is no account to take store credit from.') };
  return { order };
}

/** The customer applies their store credit to the order. */
export async function applyCreditToLinkOrder(orderId: string): Promise<LinkCreditResult> {
  const loaded = await loadOpenLinkOrder(orderId);
  if ('error' in loaded) return loaded.error;
  const order = loaded.order;
  const userId = String(order.user);
  if ((order.storeCreditUsed ?? 0) > 0 && order.storeCreditState === 'held') {
    return { ok: true, used: order.storeCreditUsed ?? 0, covered: toCents(order.storeCreditUsed ?? 0) >= toCents(order.totalPaid) };
  }

  const plan = planCreditUse(toCents(order.totalPaid), await getBalanceCents(userId));
  if (plan.creditCents <= 0) return fail(409, 'There is no store credit to use.');

  if (!(await spendCredit({ userId, cents: plan.creditCents, orderId, reason: `Order ${orderId}` }))) {
    return fail(409, 'Your store credit changed. Please try again.');
  }
  // only one request can attach credit to the order (a double tap must not take it twice)
  const orders = await db.getCollectionForOperations<Order>('orders');
  const claimed = await orders.findOneAndUpdate(
    {
      orderId,
      source: 'admin',
      paymentStatus: 'unpaid',
      status: { $ne: 'cancelled' },
      $or: [{ storeCreditUsed: { $exists: false } }, { storeCreditUsed: 0 }],
    } as never,
    { $set: { storeCreditUsed: toDollars(plan.creditCents), storeCreditState: 'held', storeCreditHeldAt: new Date(), updatedAt: new Date() } } as never,
    { returnDocument: 'after' }
  );
  if (!claimed) {
    await addCredit({ userId, cents: plan.creditCents, type: 'restored', orderId, reason: 'The order changed while the credit was applied' });
    return fail(409, 'This order was just changed. Please reload the page.');
  }

  if (plan.cardCents > 0 && order.stripePaymentIntentId) {
    const stripe = stripeClient();
    try {
      if (!stripe) throw new Error('Stripe is not configured');
      await stripe.paymentIntents.update(order.stripePaymentIntentId, {
        amount: plan.cardCents,
        metadata: { storeCreditUsed: toDollars(plan.creditCents).toFixed(2) },
      });
    } catch (error) {
      console.error('[link-credit] could not lower the card payment', { orderId, message: error instanceof Error ? error.message : String(error) });
      await giveBackLinkOrderCredit(orderId, 'The card payment could not be updated', { resetCardPayment: false });
      return fail(502, 'Could not apply the credit. Please try again.');
    }
  }
  return { ok: true, used: toDollars(plan.creditCents), covered: plan.cardCents === 0 };
}

/**
 * Gives the credit held on a link order back to the customer and clears it from the order. `resetCardPayment` puts the
 * card payment back to the full total (not needed when the order is being cancelled or paid another way).
 */
export async function giveBackLinkOrderCredit(orderId: string, reason: string, opts: { resetCardPayment?: boolean } = {}): Promise<number> {
  const found = await db.readOne<Order>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order || !order.storeCreditUsed || order.storeCreditState !== 'held') return 0;
  const cents = await restoreOrderCredit(orderId, reason);
  if (cents <= 0) return 0;
  await db.updateOne('orders', { orderId } as never, { $unset: { storeCreditUsed: '', storeCreditState: '', storeCreditHeldAt: '', storeCreditReleasedAt: '' }, $set: { updatedAt: new Date() } } as never);
  if (opts.resetCardPayment !== false && order.stripePaymentIntentId) {
    const stripe = stripeClient();
    try {
      const pi = stripe ? await stripe.paymentIntents.retrieve(order.stripePaymentIntentId) : null;
      if (stripe && pi && pi.status !== 'canceled' && pi.status !== 'succeeded' && pi.status !== 'processing') {
        await stripe.paymentIntents.update(pi.id, { amount: toCents(order.totalPaid), metadata: { storeCreditUsed: '' } });
      }
    } catch (error) {
      console.error('[link-credit] could not put the card payment back to the full total', { orderId, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return cents;
}

/** The customer switches the credit off on the pay page. */
export async function releaseCreditFromLinkOrder(orderId: string): Promise<LinkCreditResult> {
  const loaded = await loadOpenLinkOrder(orderId);
  if ('error' in loaded) return loaded.error;
  await giveBackLinkOrderCredit(orderId, 'The customer switched the credit off');
  return { ok: true, used: 0, covered: false };
}

/** Store credit pays for the whole order: it is saved as paid, the card payment is closed, the confirmation goes out. */
export async function payLinkOrderWithCredit(orderId: string): Promise<LinkCreditResult> {
  const loaded = await loadOpenLinkOrder(orderId);
  if ('error' in loaded) return loaded.error;
  const order = loaded.order;
  if (order.storeCreditState !== 'held' || toCents(order.storeCreditUsed ?? 0) < toCents(order.totalPaid)) {
    return fail(409, 'The store credit does not cover the whole order.');
  }
  const paid = await db.updateOne(
    'orders',
    { orderId, source: 'admin', paymentStatus: 'unpaid', status: { $ne: 'cancelled' }, storeCreditState: 'held' } as never,
    {
      $set: { paymentStatus: 'paid', status: 'confirmed', paymentMethod: 'Store Credit', storeCreditState: 'applied', paidAt: new Date(), updatedAt: new Date() },
      $unset: { paymentLinkTokenHash: '', paymentLinkToken: '', zellePending: '' },
    } as never
  );
  if (!paid.success) return fail(500, 'Could not place the order. Please try again.');
  if (!paid.modifiedCount) return fail(409, 'This order was just changed. Please reload the page.');

  // the order is marked paid first, so Stripe's "canceled" event for the open card payment is ignored
  const stripe = stripeClient();
  if (order.stripePaymentIntentId && stripe) {
    await stripe.paymentIntents.cancel(order.stripePaymentIntentId).catch((error) => console.warn('[link-credit] could not close the card payment', { orderId, message: String(error) }));
  }
  try {
    const fresh = await db.readOne<Order>('orders', { orderId } as never);
    if (fresh.success && fresh.data) await sendOrderConfirmationEmail(fresh.data);
  } catch (error) {
    console.error('[link-credit] confirmation email failed', { orderId, message: String(error) });
  }
  await syncOrderSafely(orderId);
  return { ok: true, used: order.storeCreditUsed ?? 0, covered: true };
}

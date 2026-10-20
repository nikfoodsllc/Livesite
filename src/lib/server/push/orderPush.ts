import { db } from '@/lib/server/db';
import { pushMode } from './config';
import { orderMessage, type OrderEvent } from './messages';
import { sendPush, type PushSummary } from './send';

interface OrderLite {
  orderId: string;
  user?: unknown;
  source?: string;
  items?: Array<{ deliveryDate?: unknown; actualDeliveryDate?: unknown }>;
}

const MS_BETWEEN_PAYMENT_LINKS = 20_000;

/** Every delivery day of an order, sorted. */
export function deliveryDatesOf(order: Pick<OrderLite, 'items'>): string[] {
  const days = new Set<string>();
  for (const d of order.items ?? []) {
    const v = String(d.actualDeliveryDate ?? d.deliveryDate ?? '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) days.add(v);
  }
  return [...days].sort();
}

/** Which log entry stops this message from being sent twice (null: may be repeated, with a short pause). */
export function guardKeyFor(event: OrderEvent, opts: { date?: string; guardKey?: string }): string | null {
  if (opts.guardKey) return opts.guardKey;
  if (event === 'payment_link') return null;
  if (event === 'on_the_way' || event === 'delivered') return `${event}-${opts.date ?? 'all'}`;
  return event;
}

/**
 * Tells the customer about their order, once per event (the same event can arrive twice, for example the two Stripe payment
 * events; the log on the order `pushLog` makes the second one do nothing). Returns null when it was already sent or there is
 * nobody to tell. Not for the customer's email address: only the account that owns the order.
 */
export async function notifyOrder(orderId: string, event: OrderEvent, opts: { date?: string; url?: string; note?: string; guardKey?: string } = {}): Promise<PushSummary | null> {
  if (pushMode() === 'off') return null;
  const orders = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  const order = (await orders.findOne({ orderId } as never, { projection: { orderId: 1, user: 1, source: 1, items: 1 } })) as OrderLite | null;
  const userId = order?.user ? String(order.user) : '';
  if (!order || !userId) return null;
  // an order an admin entered is paid from its own link: the website's payment-failed message does not apply to it
  if (event === 'payment_failed' && order.source === 'admin') return null;

  const key = guardKeyFor(event, opts);
  const now = new Date();
  const claim = key
    ? await orders.updateOne({ orderId, [`pushLog.${key}`]: { $exists: false } } as never, { $set: { [`pushLog.${key}`]: now } } as never)
    : await orders.updateOne(
        { orderId, $or: [{ 'pushLog.payment_link': { $exists: false } }, { 'pushLog.payment_link': { $lt: new Date(now.getTime() - MS_BETWEEN_PAYMENT_LINKS) } }] } as never,
        { $set: { 'pushLog.payment_link': now } } as never
      );
  if (claim.modifiedCount === 0) return null;

  const message = orderMessage(event, { orderId, dates: deliveryDatesOf(order), date: opts.date, note: opts.note, url: opts.url });
  return sendPush({ userIds: [userId], kind: 'orders', ...message, log: { orderId, event } });
}

/** Like notifyOrder, but an error is only logged: a notification must never break a payment, a delivery update or an email. */
export async function notifyOrderSafely(orderId: string, event: OrderEvent, opts: Parameters<typeof notifyOrder>[2] = {}): Promise<void> {
  try {
    await notifyOrder(orderId, event, opts);
  } catch (error) {
    console.error('[push] order notification failed', { orderId, event, message: error instanceof Error ? error.message : String(error) });
  }
}

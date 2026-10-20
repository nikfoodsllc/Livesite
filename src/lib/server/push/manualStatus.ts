import { db } from '@/lib/server/db';
import { notifyOrderSafely, deliveryDatesOf } from './orderPush';

export type ManualPushStatus = 'out_for_delivery' | 'delivered';

/** Today's date in Pacific time, as YYYY-MM-DD. */
export function pacificToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/**
 * Which delivery day a hand-made status change is about: today when the order has a delivery today, otherwise the latest day that
 * is not in the future, otherwise the first day. The same day-key is used by the OptimoRoute completion, so the customer is never told twice.
 */
export function dateForManualChange(dates: string[], today: string): string | undefined {
  if (dates.length === 0) return undefined;
  if (dates.includes(today)) return today;
  const past = dates.filter((d) => d < today);
  return past.length > 0 ? past[past.length - 1] : dates[0];
}

/**
 * An admin set these orders to Out for delivery / Delivered by hand: tell the customer (same message and once-per-day guard as the
 * automatic route). Only paid orders that really have that status now are announced. Never throws.
 */
export async function notifyManualStatus(orderIds: string[], status: ManualPushStatus): Promise<{ checked: number; announced: number }> {
  const orders = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  const found = (await orders
    .find({ orderId: { $in: orderIds } } as never, { projection: { orderId: 1, status: 1, paymentStatus: 1, items: 1 } })
    .toArray()) as unknown as Array<{ orderId: string; status?: string; paymentStatus?: string; items?: Array<{ deliveryDate?: unknown; actualDeliveryDate?: unknown }> }>;
  const today = pacificToday();
  let announced = 0;
  for (const o of found) {
    if (o.status !== status || o.paymentStatus !== 'paid') continue;
    await notifyOrderSafely(o.orderId, status === 'delivered' ? 'delivered' : 'on_the_way', { date: dateForManualChange(deliveryDatesOf(o), today) });
    announced += 1;
  }
  return { checked: found.length, announced };
}

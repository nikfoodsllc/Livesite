import { db } from '@/lib/server/db';
import { Order } from '@/types/order';
import { syncOrderSafely } from '@/lib/server/optimoRoute/sync';
import { COUNT_BLOCK_TEXT, countBlockedReason } from '@/lib/orderCounting';

export interface CountResult {
  orderId: string;
  ok: boolean;
  /** Why nothing changed (plain words) */
  reason?: string;
  /** True when the order was already in the wanted state */
  unchanged?: boolean;
}

/**
 * Turns "counted before payment" on or off for one order. Turning it on needs an unpaid, not cancelled order; turning it off
 * needs the same (a paid order counts by itself, so there is nothing to switch off). The route planner is told afterwards:
 * a stop for a day that has gone by is never created, so an old order only changes the reports.
 */
export async function setCountedBeforePayment(orderId: string, count: boolean, adminId: string): Promise<CountResult> {
  const found = await db.readOne<Order>('orders', { orderId } as never);
  if (!found.success || !found.data) return { orderId, ok: false, reason: 'order not found' };
  const order = found.data as Order & { countBeforePayment?: boolean };
  const blocked = countBlockedReason(order);
  if (blocked) return { orderId, ok: false, reason: COUNT_BLOCK_TEXT[blocked] };
  const already = order.countBeforePayment === true;
  if (already === count) return { orderId, ok: true, unchanged: true };

  const update = count
    ? { $set: { countBeforePayment: true, countedByAdmin: adminId, countedAt: new Date(), updatedAt: new Date() } }
    : { $set: { updatedAt: new Date() }, $unset: { countBeforePayment: '', countedByAdmin: '', countedAt: '' } };
  // the unpaid check is repeated in the write, so a payment that lands in between is not touched
  const written = await db.updateOne('orders', { orderId, status: { $ne: 'cancelled' }, paymentStatus: { $nin: ['paid', 'failed', 'refunded'] } } as never, update as never);
  if (!written.success) return { orderId, ok: false, reason: 'could not save, try again' };
  await syncOrderSafely(orderId);
  return { orderId, ok: true };
}

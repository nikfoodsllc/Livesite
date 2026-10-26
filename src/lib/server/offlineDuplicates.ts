import { db } from '@/lib/server/db';
import { Order } from '@/types/order';

/** An order the same customer already has for one of the same delivery dates. */
export interface PossibleDuplicate {
  orderId: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  total: number;
  /** Delivery dates of that order ('YYYY-MM-DD') that match the new order */
  sharedDates: string[];
  /** Entered by an admin (Create Order) rather than placed on the website */
  byAdmin: boolean;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The database filter for "this customer already has an order on one of these dates". Same customer = the same email (any
 * capitals) or the same 10 digit phone. Cancelled and failed orders never count. A website order only counts once it is
 * paid (an abandoned checkout is not an order); an order an admin entered counts while it waits for payment too.
 */
export function duplicateFilter(params: { email: string; phone: string; dates: string[]; excludeOrderId?: string }) {
  const dates = [...new Set(params.dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
  if (dates.length === 0) return null;
  const who: Array<Record<string, unknown>> = [];
  if (params.email) who.push({ 'customerInfo.email': { $regex: `^${escapeRegex(params.email)}$`, $options: 'i' } });
  if (params.phone) who.push({ 'customerInfo.phone': params.phone });
  if (who.length === 0) return null;
  const onDate = { $regex: `^(${dates.join('|')})` };
  return {
    $and: [
      { $or: who },
      { $or: [{ 'items.deliveryDate': onDate }, { 'items.actualDeliveryDate': onDate }] },
      { status: { $nin: ['cancelled', 'failed'] } },
      { paymentStatus: { $nin: ['failed', 'refunded'] } },
      { $or: [{ paymentStatus: 'paid' }, { source: 'admin' }] },
      ...(params.excludeOrderId ? [{ orderId: { $ne: params.excludeOrderId } }] : []),
    ],
  };
}

/** Orders the customer already has on the same dates (newest first, at most 5). Empty when nothing matches. */
export async function findPossibleDuplicates(params: { email: string; phone: string; dates: string[]; excludeOrderId?: string }): Promise<PossibleDuplicate[]> {
  const filter = duplicateFilter(params);
  if (!filter) return [];
  const wanted = new Set(params.dates);
  const found = await db.read<Order>('orders', filter as never, { sort: { createdAt: -1 }, limit: 5 } as never);
  if (!found.success) throw new Error(found.error || 'Could not look for existing orders');
  return (found.data ?? []).map((o) => {
    const theirs = new Set<string>();
    for (const day of o.items ?? []) {
      for (const d of [day.deliveryDate, day.actualDeliveryDate]) {
        const s = d ? String(d).slice(0, 10) : '';
        if (wanted.has(s)) theirs.add(s);
      }
    }
    return {
      orderId: o.orderId,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt ?? ''),
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: o.totalPaid,
      sharedDates: [...theirs].sort(),
      byAdmin: (o as { source?: string }).source === 'admin',
    };
  });
}

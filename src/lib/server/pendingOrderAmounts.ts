import { db } from '@/lib/server/db';

/**
 * A customer who started paying (the order exists, unpaid) and then changed the tip must pay the NEW total: the order, the card payment and the
 * screen all have to agree. The payment route calls this with the amounts it just worked out for the payment.
 *
 * Only an unpaid, pending order of the same customer is touched, and only when no store credit is held on it (an order that holds credit
 * keeps its amounts: its credit was planned for them). Platform Fee and tax are written too because they come from the same calculation
 * and do not depend on the tip (so for a plain tip change they stay as they were).
 * Returns what happened, so the caller can log it: 'updated', 'unchanged' (already right) or 'skipped' (not eligible).
 */
export type PendingOrderSync = 'updated' | 'unchanged' | 'skipped';

export function sameCents(a: number | undefined, b: number): boolean {
  return Math.round(Number(a ?? NaN) * 100) === Math.round(b * 100);
}

export async function syncPendingOrderAmounts(args: { orderId: string; userId: string; tip: number; total: number; platformFee: number; taxes: number }): Promise<PendingOrderSync> {
  const orders = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  const order = (await orders.findOne({ orderId: args.orderId, user: args.userId, status: 'pending', paymentStatus: 'unpaid' } as never, { projection: { tip: 1, totalPaid: 1, platformFee: 1, taxes: 1, storeCreditUsed: 1 } })) as { tip?: number; totalPaid?: number; platformFee?: number; taxes?: number; storeCreditUsed?: number } | null;
  if (!order || (order.storeCreditUsed ?? 0) > 0) return 'skipped';
  if (sameCents(order.tip, args.tip) && sameCents(order.totalPaid, args.total) && sameCents(order.platformFee, args.platformFee) && sameCents(order.taxes, args.taxes)) return 'unchanged';
  const r = await orders.updateOne(
    { orderId: args.orderId, user: args.userId, status: 'pending', paymentStatus: 'unpaid' } as never,
    { $set: { tip: Number(args.tip.toFixed(2)), totalPaid: Number(args.total.toFixed(2)), platformFee: args.platformFee, taxes: args.taxes, updatedAt: new Date() } } as never
  );
  return r.modifiedCount > 0 ? 'updated' : 'skipped';
}

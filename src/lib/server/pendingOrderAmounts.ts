import { db } from '@/lib/server/db';

/**
 * A customer who started paying (the order exists, unpaid) and then changed the tip must pay the NEW total: the order, the card payment and the
 * screen all have to agree. The payment route calls this with the amounts it just worked out for the payment.
 *
 * Only an unpaid order of the same customer is touched (still pending, or marked failed/cancelled by a declined card: the same order is
 * used again when they retry), and only when no store credit is held on it (an order that holds credit
 * keeps its amounts: its credit was planned for them). Platform Fee and tax are written too because they come from the same calculation
 * and do not depend on the tip (so for a plain tip change they stay as they were).
 * Returns what happened, so the caller can log it: 'updated', 'unchanged' (already right) or 'skipped' (not eligible).
 */
export type PendingOrderSync = 'updated' | 'unchanged' | 'skipped';

const PENDING_STATES = ['pending', 'cancelled'];
const UNPAID_STATES = ['unpaid', 'failed'];

export function sameCents(a: number | undefined, b: number): boolean {
  return Math.round(Number(a ?? NaN) * 100) === Math.round(b * 100);
}

export async function syncPendingOrderAmounts(args: { orderId: string; userId: string; tip: number; total: number; platformFee: number; taxes: number; feeRegion?: 'us' | 'intl' }): Promise<PendingOrderSync> {
  const orders = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  const order = (await orders.findOne({ orderId: args.orderId, user: args.userId, status: { $in: PENDING_STATES }, paymentStatus: { $in: UNPAID_STATES } } as never, { projection: { tip: 1, totalPaid: 1, platformFee: 1, taxes: 1, storeCreditUsed: 1, feeRegion: 1 } })) as { tip?: number; totalPaid?: number; platformFee?: number; taxes?: number; storeCreditUsed?: number; feeRegion?: string } | null;
  if (!order || (order.storeCreditUsed ?? 0) > 0) return 'skipped';
  const regionSame = args.feeRegion === undefined || (args.feeRegion === 'intl') === (order.feeRegion === 'intl');
  if (regionSame && sameCents(order.tip, args.tip) && sameCents(order.totalPaid, args.total) && sameCents(order.platformFee, args.platformFee) && sameCents(order.taxes, args.taxes)) return 'unchanged';
  // the international fee is marked on the order (the admin shows it); going back to a US card removes the mark
  const region = args.feeRegion === undefined ? {} : args.feeRegion === 'intl' ? { $set: { feeRegion: 'intl' } } : { $unset: { feeRegion: '' } };
  const r = await orders.updateOne(
    { orderId: args.orderId, user: args.userId, status: { $in: PENDING_STATES }, paymentStatus: { $in: UNPAID_STATES } } as never,
    { ...('$unset' in region ? { $unset: region.$unset } : {}), $set: { tip: Number(args.tip.toFixed(2)), totalPaid: Number(args.total.toFixed(2)), platformFee: args.platformFee, taxes: args.taxes, updatedAt: new Date(), ...('$set' in region ? region.$set : {}) } } as never
  );
  return r.modifiedCount > 0 ? 'updated' : 'skipped';
}

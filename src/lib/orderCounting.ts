/**
 * "Count it before it is paid": an admin can have an unpaid order counted in the Kitchen, Packing and Delivery reports (and put on
 * the OptimoRoute plan) while it waits for payment. Create Order sets it for new orders; the Orders table sets it for older ones.
 * An order that is paid already counts by itself, a cancelled one never counts, and a failed or refunded payment never counts.
 */
export type CountBlock = 'cancelled' | 'paid' | 'failed' | 'refunded';

export function countBlockedReason(order: { status?: string; paymentStatus?: string }): CountBlock | null {
  if (order.status === 'cancelled') return 'cancelled';
  if (order.paymentStatus === 'paid') return 'paid';
  if (order.paymentStatus === 'failed') return 'failed';
  if (order.paymentStatus === 'refunded') return 'refunded';
  return null;
}

export const COUNT_BLOCK_TEXT: Record<CountBlock, string> = {
  cancelled: 'it is cancelled',
  paid: 'it is paid already, so it counts by itself',
  failed: 'its payment failed',
  refunded: 'it was refunded',
};

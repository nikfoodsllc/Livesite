/**
 * What a customer sees about refunds on an order.
 * (Same rules as the admin's utils/refunds.ts, so both places always agree.)
 */
interface RefundableOrder {
  paymentStatus: 'unpaid' | 'paid' | 'failed' | 'refunded';
  totalPaid: number;
  refundedAmount?: number;
  /** Store credit that paid part of the order: the card (and any Stripe refund) only covers the rest */
  storeCreditUsed?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * How much of the order has been refunded, in dollars. A fully refunded order counts as refunded in
 * full, including older ones refunded before the refunded amount was recorded.
 */
export function getRefundedAmount(order: RefundableOrder): number {
  if (order.paymentStatus === 'refunded') return round2(order.totalPaid || 0);
  const refunded = order.refundedAmount;
  if (typeof refunded !== 'number' || !(refunded > 0)) return 0;
  return round2(Math.min(refunded, order.totalPaid || 0));
}

/** The order total after refunds: 0 for a full refund, never negative. */
export function getNetTotal(order: RefundableOrder): number {
  const cardTotal = Math.max(0, (order.totalPaid || 0) - (order.storeCreditUsed || 0));
  return round2(Math.max(0, cardTotal - getRefundedAmount(order)));
}

export function isFullyRefunded(order: RefundableOrder): boolean {
  const refunded = getRefundedAmount(order);
  return refunded > 0 && refunded >= round2(order.totalPaid || 0);
}

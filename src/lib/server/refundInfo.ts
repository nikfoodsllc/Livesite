import type Stripe from 'stripe';

export interface RefundUpdate {
  /** Total refunded so far, in dollars (Stripe reports cents). */
  refundedAmount: number;
  /** True only when the whole charge has been refunded. */
  fullyRefunded: boolean;
}

/**
 * Reads how much of a charge has been refunded. A partial refund (say $5 back on a $45 order) must
 * not cancel the order; only a refund of the whole charge does.
 */
export function refundFromCharge(
  charge: Pick<Stripe.Charge, 'amount' | 'amount_refunded' | 'refunded'>
): RefundUpdate {
  const refundedCents = Math.max(0, charge.amount_refunded ?? 0);
  return {
    refundedAmount: Number((refundedCents / 100).toFixed(2)),
    fullyRefunded: charge.refunded === true || (charge.amount > 0 && refundedCents >= charge.amount),
  };
}

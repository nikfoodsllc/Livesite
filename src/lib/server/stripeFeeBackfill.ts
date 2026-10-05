import type Stripe from 'stripe';
import { stripeFeeFromBalanceTransaction, type StripeFeeInfo } from '@/lib/server/stripeFee';

/** Why an order was left alone. */
export type BackfillSkipReason =
  | 'no_payment_intent'
  | 'not_in_this_stripe_account'
  | 'stripe_error'
  | 'payment_not_succeeded'
  | 'no_charge_or_balance_transaction'
  | 'order_id_mismatch'
  | 'amount_mismatch'
  | 'invalid_fee';

export type BackfillDecision = ({ action: 'update' } & StripeFeeInfo) | { action: 'skip'; reason: BackfillSkipReason };

interface OrderForBackfill {
  orderId: string;
  totalPaid: number;
}

/**
 * Decides whether the Stripe fee of an old order can be saved, from the order and its PaymentIntent
 * (fetched with latest_charge.balance_transaction expanded). It only says "update" when everything lines
 * up: the payment succeeded, the order number Stripe has on the payment (if any) is this order's, and the
 * amount Stripe took equals what the order says was paid. Anything doubtful is skipped, never guessed.
 */
export function planFeeBackfill(
  order: OrderForBackfill,
  intent: Pick<Stripe.PaymentIntent, 'status' | 'metadata' | 'latest_charge'> | null | undefined
): BackfillDecision {
  if (!intent) return { action: 'skip', reason: 'no_payment_intent' };
  if (intent.status !== 'succeeded') return { action: 'skip', reason: 'payment_not_succeeded' };

  const charge = intent.latest_charge;
  if (!charge || typeof charge === 'string' || !charge.paid) return { action: 'skip', reason: 'no_charge_or_balance_transaction' };
  const bt = charge.balance_transaction;
  if (!bt || typeof bt === 'string') return { action: 'skip', reason: 'no_charge_or_balance_transaction' };

  const taggedOrderId = intent.metadata?.orderId;
  if (taggedOrderId && taggedOrderId !== order.orderId) return { action: 'skip', reason: 'order_id_mismatch' };

  if (typeof bt.amount !== 'number' || Math.abs(bt.amount / 100 - order.totalPaid) > 0.011) {
    return { action: 'skip', reason: 'amount_mismatch' };
  }

  const info = stripeFeeFromBalanceTransaction(bt);
  if (!info) return { action: 'skip', reason: 'invalid_fee' };
  return { action: 'update', ...info };
}

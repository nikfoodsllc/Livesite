import type Stripe from 'stripe';

/** What Stripe charged us for a payment, in dollars. */
export interface StripeFeeInfo {
  stripeFee: number; // Stripe's processing fee
  stripeNet: number; // what reaches our balance: amount - fee
}

const toDollars = (cents: number) => Math.round(cents) / 100;

/** The fee and net from a Stripe balance transaction; null when it is missing or not usable. */
export function stripeFeeFromBalanceTransaction(
  bt: Pick<Stripe.BalanceTransaction, 'fee' | 'net'> | null | undefined
): StripeFeeInfo | null {
  if (!bt || typeof bt.fee !== 'number' || typeof bt.net !== 'number') return null;
  if (!Number.isFinite(bt.fee) || !Number.isFinite(bt.net) || bt.fee < 0) return null;
  return { stripeFee: toDollars(bt.fee), stripeNet: toDollars(bt.net) };
}

/**
 * The fee for a charge. The charge event carries the balance transaction as an id (or already
 * expanded); an id is looked up. Returns null instead of throwing: the fee is a bookkeeping extra and
 * must never get in the way of confirming the order.
 */
export async function fetchChargeFee(
  stripe: Pick<Stripe, 'balanceTransactions'>,
  charge: Pick<Stripe.Charge, 'balance_transaction'>
): Promise<StripeFeeInfo | null> {
  try {
    const ref = charge.balance_transaction;
    if (!ref) return null;
    const bt = typeof ref === 'string' ? await stripe.balanceTransactions.retrieve(ref) : ref;
    return stripeFeeFromBalanceTransaction(bt);
  } catch (error) {
    console.error('[Stripe fee] Could not read the fee:', error instanceof Error ? error.message : error);
    return null;
  }
}

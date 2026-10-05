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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The fee for a charge. The balance transaction is usually NOT on the charge inside the webhook event
 * yet (Stripe attaches it a moment later), so when it is missing the charge is read again from Stripe,
 * once more after a short wait. Returns null instead of throwing: the fee is a bookkeeping extra and
 * must never get in the way of confirming the order.
 */
export async function fetchChargeFee(
  stripe: Pick<Stripe, 'balanceTransactions' | 'charges'>,
  charge: Pick<Stripe.Charge, 'id' | 'balance_transaction'>,
  options: { retries?: number; waitMs?: number } = {}
): Promise<StripeFeeInfo | null> {
  const retries = options.retries ?? 1;
  const waitMs = options.waitMs ?? 1500;
  try {
    let ref: Stripe.Charge['balance_transaction'] = charge.balance_transaction;
    for (let attempt = 0; !ref && attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(waitMs);
      const fresh = await stripe.charges.retrieve(charge.id, { expand: ['balance_transaction'] });
      ref = fresh.balance_transaction;
    }
    if (!ref) return null;
    const bt = typeof ref === 'string' ? await stripe.balanceTransactions.retrieve(ref) : ref;
    return stripeFeeFromBalanceTransaction(bt);
  } catch (error) {
    console.error('[Stripe fee] Could not read the fee:', error instanceof Error ? error.message : error);
    return null;
  }
}

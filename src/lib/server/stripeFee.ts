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
 * again after a short wait, up to three more times. Returns null instead of throwing: the fee is a bookkeeping extra and
 * must never get in the way of confirming the order.
 */
export async function fetchChargeFee(
  stripe: Pick<Stripe, 'balanceTransactions' | 'charges'>,
  charge: Pick<Stripe.Charge, 'id' | 'balance_transaction'>,
  options: { retries?: number; waitMs?: number } = {}
): Promise<StripeFeeInfo | null> {
  // Stripe can take several seconds to attach the fee to a charge (seen on live Link payments), so wait
  // up to ~6 s in total; the caller runs this AFTER the order is confirmed and the email is sent.
  const retries = options.retries ?? 3;
  const waitMs = options.waitMs ?? 2000;
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

/**
 * The fee of a PaymentIntent's latest charge, read straight from Stripe (used to fill a fee that was
 * missed at payment time). Null when the payment has no successful charge or no fee yet.
 */
export async function fetchPaymentIntentFee(
  stripe: Pick<Stripe, 'paymentIntents'>,
  paymentIntentId: string
): Promise<StripeFeeInfo | null> {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge.balance_transaction'] });
    const charge = pi.latest_charge;
    if (!charge || typeof charge === 'string' || charge.status !== 'succeeded') return null;
    const bt = charge.balance_transaction;
    if (!bt || typeof bt === 'string') return null;
    return stripeFeeFromBalanceTransaction(bt);
  } catch (error) {
    console.error('[Stripe fee] Could not read the fee:', error instanceof Error ? error.message : error);
    return null;
  }
}

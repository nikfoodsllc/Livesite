import type Stripe from 'stripe';

export interface StripeRefundNote {
  id: string;
  /** Dollars */
  amount: number;
  at: string;
  /** Stripe's refund reason (duplicate, fraudulent, requested_by_customer) when one was picked */
  reason?: string;
  /** What the person refunding wrote on the refund in Stripe (its metadata values, joined) */
  note?: string;
  status?: string;
}

/** The refunds on a charge with the notes written on them in Stripe. Best effort: [] when Stripe cannot be read. */
export async function fetchRefundNotes(stripe: Stripe, chargeId: string): Promise<StripeRefundNote[]> {
  try {
    const list = await stripe.refunds.list({ charge: chargeId, limit: 20 });
    return list.data
      .map((r) => {
        const note = Object.values(r.metadata ?? {})
          .map((v) => String(v).trim())
          .filter(Boolean)
          .join(' · ')
          .slice(0, 500);
        return {
          id: r.id,
          amount: Number(((r.amount ?? 0) / 100).toFixed(2)),
          at: new Date((r.created ?? 0) * 1000).toISOString(),
          ...(r.reason ? { reason: String(r.reason) } : {}),
          ...(note ? { note } : {}),
          ...(r.status ? { status: String(r.status) } : {}),
        };
      })
      .sort((a, b) => a.at.localeCompare(b.at));
  } catch (error) {
    console.warn('[Webhook] could not read the refunds of a charge', error instanceof Error ? error.message : error);
    return [];
  }
}

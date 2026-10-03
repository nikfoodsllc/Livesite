import type Stripe from 'stripe';
import type { Order } from '@/types/order';
import { buildOrderDescription } from '@/lib/server/stripePaymentInfo';

/**
 * Writes where a payment stands onto the Stripe PaymentIntent itself (description + metadata), so a
 * payment that is "incomplete" in the Stripe dashboard says why without opening our admin.
 */
export type PaymentProgress =
  | { kind: 'failed'; code: string; declineCode?: string; attempts: number }
  | { kind: 'needs_action' }
  | { kind: 'canceled'; reason: string }
  | { kind: 'paid' };

export interface PaymentNote {
  description: string;
  /** An empty value removes the key in Stripe. */
  metadata: Record<string, string>;
}

type OrderForNote = Pick<Order, 'orderId' | 'customerInfo'>;

export function buildPaymentNote(order: OrderForNote, progress: PaymentProgress): PaymentNote {
  const base = buildOrderDescription(order);
  switch (progress.kind) {
    case 'failed': {
      const why = progress.declineCode || progress.code;
      return {
        description: `${base} - payment failed: ${why} (attempt ${progress.attempts})`.slice(0, 1000),
        metadata: {
          incompleteReason: 'payment_failed',
          failedAttempts: String(progress.attempts),
          lastFailure: progress.declineCode ? `${progress.code}/${progress.declineCode}` : progress.code,
        },
      };
    }
    case 'needs_action':
      return {
        description: `${base} - waiting for 3D Secure`.slice(0, 1000),
        metadata: { incompleteReason: 'authentication_pending' },
      };
    case 'canceled':
      return {
        description: `${base} - canceled: ${progress.reason}`.slice(0, 1000),
        metadata: { incompleteReason: 'canceled', cancelReason: progress.reason.slice(0, 100) },
      };
    case 'paid':
      return { description: base, metadata: { incompleteReason: '' } };
  }
}

/**
 * Best effort: a failed update must never stop the webhook from doing its real work.
 *
 * When the payment succeeded, pass the charge id too: Stripe copies the PaymentIntent's description
 * and metadata onto a charge when it is created, so the successful charge would otherwise keep the
 * "payment failed ..." note from the earlier attempts.
 */
export async function annotatePaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
  order: OrderForNote,
  progress: PaymentProgress,
  chargeId?: string | null
): Promise<void> {
  const note = buildPaymentNote(order, progress);
  try {
    await stripe.paymentIntents.update(paymentIntentId, {
      description: note.description,
      metadata: note.metadata,
    });
  } catch (error) {
    console.warn(`[Webhook] Could not write the payment note for ${paymentIntentId}:`, error);
  }

  if (progress.kind === 'paid' && chargeId) {
    try {
      await stripe.charges.update(chargeId, {
        description: note.description,
        metadata: note.metadata,
      });
    } catch (error) {
      console.warn(`[Webhook] Could not clear the note on charge ${chargeId}:`, error);
    }
  }
}

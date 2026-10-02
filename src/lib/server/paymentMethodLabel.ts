import type Stripe from 'stripe';
import type { PaymentMethod } from '@/types/order';

/**
 * Turns the payment method Stripe actually used for a charge into the label stored on the order.
 *
 * The checkout page cannot know which row of the Stripe payment form the customer used, so orders
 * are created as 'Credit Card'; the webhook corrects the label once Stripe confirms the payment.
 *
 * Returns null when Stripe gives no details, so the caller keeps whatever label the order has.
 */
export function paymentMethodLabelFromCharge(
  charge: Pick<Stripe.Charge, 'payment_method_details'> | null | undefined
): PaymentMethod | null {
  const details = charge?.payment_method_details;
  if (!details || !details.type) return null;

  switch (details.type) {
    case 'card': {
      // Apple Pay, Google Pay and Link are card payments made through a wallet.
      switch (details.card?.wallet?.type) {
        case 'apple_pay':
          return 'Apple Pay';
        case 'google_pay':
          return 'Google Pay';
        case 'link':
          return 'Link';
        default:
          return 'Credit Card';
      }
    }
    case 'link':
      return 'Link';
    case 'us_bank_account':
      return 'Bank';
    case 'klarna':
      return 'Klarna';
    default:
      return 'Other';
  }
}

/**
 * Looks up the charge behind a PaymentIntent (the payment_intent.succeeded event only carries its
 * id) and returns its label. Never throws: a failed lookup must not stop the order being marked
 * as paid, it just leaves the existing label in place.
 */
export async function resolvePaymentMethodLabel(
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent
): Promise<PaymentMethod | null> {
  try {
    const latest = paymentIntent.latest_charge;
    if (!latest) return null;
    const charge = typeof latest === 'string' ? await stripe.charges.retrieve(latest) : latest;
    const label = paymentMethodLabelFromCharge(charge);
    if (label === 'Other') {
      console.warn(
        `[Webhook] Unrecognised payment method type "${charge.payment_method_details?.type}" for PaymentIntent ${paymentIntent.id}`
      );
    }
    return label;
  } catch (error) {
    console.warn(`[Webhook] Could not read the payment method for PaymentIntent ${paymentIntent.id}:`, error);
    return null;
  }
}

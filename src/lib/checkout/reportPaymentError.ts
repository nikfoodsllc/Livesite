export type PaymentErrorStage =
  | 'create_payment_intent'
  | 'create_order'
  | 'submit_form'
  | 'confirm_payment'
  | 'confirm_incomplete'
  | 'unexpected';

export interface PaymentErrorReport {
  stage: PaymentErrorStage;
  message: string;
  /** Stripe error code, e.g. 'card_declined' */
  code?: string;
  /** e.g. 'insufficient_funds' */
  declineCode?: string;
  type?: string;
  orderId?: string | null;
  paymentIntentId?: string | null;
}

/** A PaymentIntent's id is the part of its client secret before "_secret_". */
export function paymentIntentIdFromClientSecret(clientSecret?: string | null): string | undefined {
  const id = clientSecret?.split('_secret_')[0];
  return id && id.startsWith('pi_') ? id : undefined;
}

/**
 * Tells the server about a checkout payment error that only the browser can see, so it is stored
 * next to the order (see /api/checkout/log-payment-error). Fire-and-forget: it never throws and
 * never triggers the session-expired handling a normal API call would.
 */
export function reportPaymentError(report: PaymentErrorReport): void {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token || !report.message) return;
    void fetch('/api/checkout/log-payment-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...report,
        orderId: report.orderId ?? undefined,
        paymentIntentId: report.paymentIntentId ?? undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // reporting is best effort
  }
}

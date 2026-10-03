export type ReturnDestination =
  | { kind: 'success'; orderId: string }
  | { kind: 'processing'; orderId?: string }
  | { kind: 'orders' }
  | { kind: 'failure'; error: string };

/**
 * Where the checkout return page (the page Stripe sends the customer back to after a redirect
 * payment) should send them. A payment that Stripe says succeeded is never shown as a failure,
 * even if we could not work out which order it was.
 */
export function decideReturnDestination(input: {
  status?: string;
  orderId?: string;
  lastErrorMessage?: string;
}): ReturnDestination {
  const { status, orderId, lastErrorMessage } = input;
  if (status === 'succeeded') {
    return orderId ? { kind: 'success', orderId } : { kind: 'orders' };
  }
  if (status === 'processing') {
    return { kind: 'processing', orderId };
  }
  return { kind: 'failure', error: lastErrorMessage || 'Payment was not completed' };
}

/** Asks our server which order a Stripe payment belongs to (see /api/checkout/payment-order). */
export async function lookupOrderIdForPayment(paymentIntentId: string): Promise<string | undefined> {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return undefined;
    const response = await fetch(
      `/api/checkout/payment-order?paymentIntentId=${encodeURIComponent(paymentIntentId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) return undefined;
    const data = await response.json();
    return typeof data?.data?.orderId === 'string' ? data.data.orderId : undefined;
  } catch {
    return undefined;
  }
}

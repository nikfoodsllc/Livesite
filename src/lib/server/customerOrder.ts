/**
 * Orders as customers may see them.
 *
 * The orders API used to return the whole saved order, which includes fields that are for the business
 * only: what Stripe charged us (stripeFee/stripeNet), why a payment failed and how many times, the
 * failed attempts the browser reported, and the email send status/lock. None of the customer pages or
 * the mobile app read them, so they are removed before the order leaves the server.
 */
export const INTERNAL_ORDER_FIELDS = [
  'stripeFee',
  'stripeNet',
  'paymentError',
  'paymentAttempts',
  'clientPaymentErrors',
  'paymentActionRequiredAt',
  'emailStatus',
  'paymentFailedEmailStatus',
  'emailLock',
  'paymentLinkTokenHash',
  'createdByAdmin',
  'offlinePaymentNote',
  'platformFeeWaived',
  'reschedules',
  'rescheduleEmail',
  'rescheduleEmailLock',
] as const;

export function toCustomerOrder<T extends object>(order: T): Omit<T, (typeof INTERNAL_ORDER_FIELDS)[number]> {
  const copy: Record<string, unknown> = { ...(order as Record<string, unknown>) };
  for (const field of INTERNAL_ORDER_FIELDS) delete copy[field];
  return copy as Omit<T, (typeof INTERNAL_ORDER_FIELDS)[number]>;
}

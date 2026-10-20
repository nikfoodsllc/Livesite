import { customerDeliveryProgress } from '@/lib/deliveryProgress';
import { isFullyCredited } from '@/lib/storeCredit';

/**
 * Orders as customers may see them.
 *
 * The orders API used to return the whole saved order, which includes fields that are for the business
 * only: what Stripe charged us (stripeFee/stripeNet), why a payment failed and how many times, the
 * failed attempts the browser reported, and the email send status/lock. None of the customer pages or
 * the mobile app read them, so they are removed before the order leaves the server.
 */
export const INTERNAL_ORDER_FIELDS = [
  'channel',
  'stripeFee',
  'stripeRefunds',
  'preCreditTotals',
  'stripeNet',
  'paymentError',
  'paymentAttempts',
  'clientPaymentErrors',
  'paymentActionRequiredAt',
  'emailStatus',
  'paymentFailedEmailStatus',
  'emailLock',
  'paymentLinkTokenHash',
  'paymentLinkToken',
  'createdByAdmin',
  'offlinePaymentNote',
  'platformFeeWaived',
  'reschedules',
  'rescheduleEmail',
  'rescheduleEmailLock',
  'rescheduleSms',
  'rescheduleSmsLock',
  'creditEmail',
  'storeCreditReleasedAt',
  'storeCreditHeldAt',
  'creditShortfall',
  // the OptimoRoute sync record (stops, per-day delivery results, issues): for the team only
  'optimo',
] as const;

export function toCustomerOrder<T extends object>(order: T): Omit<T, (typeof INTERNAL_ORDER_FIELDS)[number]> {
  const copy: Record<string, unknown> = { ...(order as Record<string, unknown>) };
  // a partly delivered order tells the customer which days are delivered (just date + yes/no), before the team's record is removed
  if (copy.status === 'partially_delivered') {
    const progress = customerDeliveryProgress((copy.optimo as { deliveries?: unknown } | undefined)?.deliveries);
    if (progress.length > 0) copy.deliveryProgress = progress;
  }
  for (const field of INTERNAL_ORDER_FIELDS) delete copy[field];
  // credit an admin gave for items: the customer sees what and how much, not which admin
  if (Array.isArray(copy.creditsIssued)) {
    const fullyCredited = isFullyCredited(copy as Parameters<typeof isFullyCredited>[0]);
    copy.creditsIssued = (copy.creditsIssued as Array<Record<string, unknown>>).map((entry) => {
      const { by: _by, internalNote: _internal, ...rest } = entry;
      void _by;
      void _internal;
      // a full credit shows only the total: the Platform Fee and tip amounts are not sent to the customer
      if (fullyCredited) {
        delete rest.fee;
        delete rest.tip;
      }
      return rest;
    });
  }
  // items an admin moved to another delivery date carry the date they started with: business only
  if (Array.isArray(copy.items)) {
    copy.items = (copy.items as Array<Record<string, unknown>>).map((line) =>
      line && Array.isArray(line.items)
        ? {
            ...line,
            items: (line.items as Array<Record<string, unknown>>).map((item) => {
              if (item && 'originalDeliveryDate' in item) {
                const { originalDeliveryDate: _original, ...rest } = item;
                void _original;
                return rest;
              }
              return item;
            }),
          }
        : line
    );
  }
  return copy as Omit<T, (typeof INTERNAL_ORDER_FIELDS)[number]>;
}

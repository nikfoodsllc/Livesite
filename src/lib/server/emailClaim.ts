import type { EmailStatusInfo } from '@/types/order';

/**
 * Makes sure only ONE request sends an order's confirmation email.
 *
 * When a payment succeeds, Stripe sends two events (payment_intent.succeeded and charge.succeeded)
 * a fraction of a second apart, and each used to send the email: each request checked its own copy
 * of the order, read before the other had written "sent". Here the right to send is taken with a
 * single atomic database update, so exactly one request wins and the others skip.
 *
 * The lock is a separate field (not the email status) because a failed send leaves the status at
 * "retrying" / "failed", which looks the same as "someone is sending right now". It expires, so a
 * request that crashed mid-send cannot block the retry job for good.
 */
export const EMAIL_LOCK_STALE_MS = 2 * 60 * 1000;

/** The bit of a MongoDB collection this needs (kept small so it can be tested against a real one). */
export interface OrdersCollectionLike {
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: { returnDocument: 'after' }
  ): Promise<{ emailStatus?: EmailStatusInfo } | null>;
  findOne(filter: Record<string, unknown>): Promise<{ emailStatus?: EmailStatusInfo } | null>;
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<unknown>;
}

export type EmailClaim =
  | { kind: 'claimed'; emailStatus?: EmailStatusInfo }
  /** Another request already sent it: nothing to do. */
  | { kind: 'already_sent'; emailStatus?: EmailStatusInfo }
  /** Another request is sending it right now: skip, it will record the result. */
  | { kind: 'in_progress' }
  /** No such order in the database (the test routes use made-up orders): send without a lock. */
  | { kind: 'no_order' };

export async function claimConfirmationEmail(
  orders: OrdersCollectionLike,
  orderId: string,
  now: Date = new Date()
): Promise<EmailClaim> {
  const staleBefore = new Date(now.getTime() - EMAIL_LOCK_STALE_MS);

  const claimed = await orders.findOneAndUpdate(
    {
      orderId,
      'emailStatus.status': { $ne: 'sent' },
      $or: [{ emailLock: { $exists: false } }, { 'emailLock.at': { $lt: staleBefore } }],
    },
    { $set: { emailLock: { at: now } } },
    { returnDocument: 'after' }
  );
  if (claimed) {
    // The status as it is NOW in the database, not as it was when this request began
    return { kind: 'claimed', emailStatus: claimed.emailStatus };
  }

  const current = await orders.findOne({ orderId });
  if (!current) return { kind: 'no_order' };
  if (current.emailStatus?.status === 'sent') {
    return { kind: 'already_sent', emailStatus: current.emailStatus };
  }
  return { kind: 'in_progress' };
}

/** Hands the lock back once the send has finished (or failed), so a retry can take it. */
export async function releaseConfirmationEmailLock(
  orders: OrdersCollectionLike,
  orderId: string
): Promise<void> {
  await orders.updateOne({ orderId }, { $unset: { emailLock: '' } });
}

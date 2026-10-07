import { db } from '@/lib/server/db';
import type { EmailEventInput } from '@/lib/server/paymentLinkTracking';

/**
 * What the email provider (Resend) reported about the ORDER CONFIRMATION email of an order, kept in `order.emailDelivery`
 * (a field of its own, so re-sending the email, which rewrites `emailStatus`, never erases it). The order is found by the
 * message id saved in `emailStatus.messageId` when the email was sent.
 *
 * An "opened" is only a hint: it comes from a tracking pixel, Apple Mail and some scanners load it on their own, and the support
 * copy (Bcc) of the same email can be opened by the team too. Best effort: nothing here may ever make an order or an email fail.
 */

export type DeliveryStatus = 'delivered' | 'delayed' | 'bounced' | 'complained' | 'failed';

export interface EmailDelivery {
  status?: DeliveryStatus;
  deliveredAt?: Date;
  bouncedAt?: Date;
  bounceReason?: string;
  firstOpenedAt?: Date;
  lastOpenedAt?: Date;
  openCount?: number;
}

interface Update {
  set?: Record<string, unknown>;
  min?: Record<string, unknown>;
  max?: Record<string, unknown>;
  inc?: Record<string, number>;
  /** only when the current status is one of these (or none yet) */
  onlyIfStatus?: DeliveryStatus[];
}

/** The change one provider event makes (pure, so it can be tested), or null when we do not track that event type. */
export function confirmationEventUpdate(event: EmailEventInput): Update | null {
  switch (event.type) {
    case 'email.delivered':
      // never turns a bounce or complaint back into "delivered"
      return { set: { 'emailDelivery.status': 'delivered', 'emailDelivery.deliveredAt': event.at }, onlyIfStatus: ['delayed', 'delivered'] };
    case 'email.delivery_delayed':
      return { set: { 'emailDelivery.status': 'delayed' }, onlyIfStatus: ['delayed'] };
    case 'email.bounced':
      return { set: { 'emailDelivery.status': 'bounced', 'emailDelivery.bouncedAt': event.at, ...(event.bounceReason ? { 'emailDelivery.bounceReason': event.bounceReason.slice(0, 200) } : {}) } };
    case 'email.failed':
      return { set: { 'emailDelivery.status': 'failed' }, onlyIfStatus: ['delayed'] };
    case 'email.complained':
      return { set: { 'emailDelivery.status': 'complained' } };
    case 'email.opened':
      // events can arrive out of order: the first open is the earliest time seen, the last open the latest
      return { min: { 'emailDelivery.firstOpenedAt': event.at }, max: { 'emailDelivery.lastOpenedAt': event.at }, inc: { 'emailDelivery.openCount': 1 } };
    default:
      return null;
  }
}

/** Applies a provider event to the order whose confirmation email has this id. Returns false when no order has it. */
export async function applyConfirmationEmailEvent(event: EmailEventInput): Promise<boolean> {
  const update = confirmationEventUpdate(event);
  if (!update || !event.emailId) return false;
  try {
    const collection = await db.getCollectionForOperations('orders');
    const filter: Record<string, unknown> = { 'emailStatus.messageId': event.emailId };
    if (update.onlyIfStatus) filter.$or = [{ 'emailDelivery.status': { $exists: false } }, { 'emailDelivery.status': { $in: update.onlyIfStatus } }];
    const ops: Record<string, unknown> = {};
    if (update.set) ops.$set = update.set;
    if (update.min) ops.$min = update.min;
    if (update.max) ops.$max = update.max;
    if (update.inc) ops.$inc = update.inc;
    const result = await collection.updateOne(filter as never, ops as never);
    if (result.matchedCount > 0) return true;
    // the event was refused by the status rule (a delivered after a bounce): the order still has this email
    if (update.onlyIfStatus) return (await collection.countDocuments({ 'emailStatus.messageId': event.emailId } as never, { limit: 1 })) > 0;
    return false;
  } catch (error) {
    console.warn('[confirmation-email-tracking] apply event failed', error instanceof Error ? error.message : error);
    return false;
  }
}

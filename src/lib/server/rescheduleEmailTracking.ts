import { db } from '@/lib/server/db';
import type { EmailEventInput } from '@/lib/server/paymentLinkTracking';
import { confirmationEventUpdate } from '@/lib/server/confirmationEmailTracking';

/**
 * What the email provider (Resend) reported about the "your delivery date changed" email, kept in `order.rescheduleEmail.delivery`.
 * The order is found by the message id saved in `rescheduleEmail.messageId` when the admin sent the email; sending it again
 * replaces the record (a new email, a fresh status). The support copy has its own message id, so it never matches.
 * Same rules as the confirmation email (a bounce is never turned back into "delivered"; an open is only a hint).
 */
const FROM = 'emailDelivery.';
const TO = 'rescheduleEmail.delivery.';

function moveKeys(values: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!values) return undefined;
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k.replace(FROM, TO), v]));
}

export async function applyRescheduleEmailEvent(event: EmailEventInput): Promise<boolean> {
  const base = confirmationEventUpdate(event);
  if (!base || !event.emailId) return false;
  try {
    const collection = await db.getCollectionForOperations('orders');
    const filter: Record<string, unknown> = { 'rescheduleEmail.messageId': event.emailId };
    if (base.onlyIfStatus) filter.$or = [{ 'rescheduleEmail.delivery.status': { $exists: false } }, { 'rescheduleEmail.delivery.status': { $in: base.onlyIfStatus } }];
    const ops: Record<string, unknown> = {};
    const set = moveKeys(base.set);
    const min = moveKeys(base.min);
    const max = moveKeys(base.max);
    const inc = moveKeys(base.inc as Record<string, unknown> | undefined);
    if (set) ops.$set = set;
    if (min) ops.$min = min;
    if (max) ops.$max = max;
    if (inc) ops.$inc = inc;
    const result = await collection.updateOne(filter as never, ops as never);
    if (result.matchedCount > 0) return true;
    if (base.onlyIfStatus) return (await collection.countDocuments({ 'rescheduleEmail.messageId': event.emailId } as never, { limit: 1 })) > 0;
    return false;
  } catch (error) {
    console.warn('[reschedule-email-tracking] apply event failed', error instanceof Error ? error.message : error);
    return false;
  }
}

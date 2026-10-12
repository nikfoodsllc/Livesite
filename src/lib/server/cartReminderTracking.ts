import { db } from '@/lib/server/db';
import { looksLikeBot, type EmailEventInput } from '@/lib/server/paymentLinkTracking';

/**
 * What happened to the cart reminder email of an abandoned checkout, kept on the draft as `reminderEmail` (see
 * lib/server/cartReminders.ts for how it is sent):
 *   sentAt / messageId   when it was sent and the provider's id for it
 *   status               sent -> delivered / delayed / bounced / complained / failed (the provider's word)
 *   firstOpenedAt ...    opened (a tracking pixel: only a hint, Apple Mail and some scanners load images on their own)
 *   firstClickedAt ...   the customer's browser really loaded the cart from the button (the reliable sign)
 * Best effort: nothing here may ever make a payment, a cart or an email fail.
 */

export type ReminderStatus = 'claimed' | 'sent' | 'delivered' | 'delayed' | 'bounced' | 'complained' | 'failed';

export interface ReminderEmailRecord {
  token?: string;
  claimedAt?: Date;
  attempts?: number;
  sentAt?: Date;
  messageId?: string;
  provider?: string;
  status: ReminderStatus;
  error?: string;
  deliveredAt?: Date;
  bouncedAt?: Date;
  bounceReason?: string;
  firstOpenedAt?: Date;
  lastOpenedAt?: Date;
  openCount?: number;
  firstClickedAt?: Date;
  lastClickedAt?: Date;
  clickCount?: number;
}

const COLLECTION = 'checkoutDrafts';
/** Loads of the cart closer together than this count as one (a reload, a double fire). */
const CLICK_DEDUPE_SECONDS = 15;
/** Tokens are 48 hex characters */
export const isReminderToken = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{48}$/.test(value);

interface Update {
  set?: Record<string, unknown>;
  min?: Record<string, unknown>;
  max?: Record<string, unknown>;
  inc?: Record<string, number>;
  onlyIfStatus?: ReminderStatus[];
}

/** The change one provider event makes (pure, so it can be tested), or null when we do not track that event type. */
export function reminderEventUpdate(event: EmailEventInput): Update | null {
  const p = 'reminderEmail.';
  switch (event.type) {
    case 'email.delivered':
      // never turns a bounce or complaint back into "delivered"
      return { set: { [`${p}status`]: 'delivered', [`${p}deliveredAt`]: event.at }, onlyIfStatus: ['sent', 'delayed', 'delivered'] };
    case 'email.delivery_delayed':
      return { set: { [`${p}status`]: 'delayed' }, onlyIfStatus: ['sent', 'delayed'] };
    case 'email.bounced':
      return { set: { [`${p}status`]: 'bounced', [`${p}bouncedAt`]: event.at, ...(event.bounceReason ? { [`${p}bounceReason`]: event.bounceReason.slice(0, 200) } : {}) } };
    case 'email.failed':
      return { set: { [`${p}status`]: 'failed' }, onlyIfStatus: ['sent', 'delayed'] };
    case 'email.complained':
      return { set: { [`${p}status`]: 'complained' } };
    case 'email.opened':
      // events can arrive out of order: the first open is the earliest time seen, the last open the latest
      return { min: { [`${p}firstOpenedAt`]: event.at }, max: { [`${p}lastOpenedAt`]: event.at }, inc: { [`${p}openCount`]: 1 } };
    default:
      return null;
  }
}

/** Applies a provider event to the draft whose reminder email has this id. Returns false when no draft has it. */
export async function applyCartReminderEmailEvent(event: EmailEventInput): Promise<boolean> {
  const update = reminderEventUpdate(event);
  if (!update || !event.emailId) return false;
  try {
    const collection = await db.getCollectionForOperations(COLLECTION);
    const filter: Record<string, unknown> = { 'reminderEmail.messageId': event.emailId };
    if (update.onlyIfStatus) filter['reminderEmail.status'] = { $in: update.onlyIfStatus };
    const ops: Record<string, unknown> = {};
    if (update.set) ops.$set = update.set;
    if (update.min) ops.$min = update.min;
    if (update.max) ops.$max = update.max;
    if (update.inc) ops.$inc = update.inc;
    const result = await collection.updateOne(filter as never, ops as never);
    if (result.matchedCount > 0) return true;
    // refused by the status rule (a delivered after a bounce): the draft still has this email
    if (update.onlyIfStatus) return (await collection.countDocuments({ 'reminderEmail.messageId': event.emailId } as never, { limit: 1 })) > 0;
    return false;
  } catch (error) {
    console.warn('[cart-reminder-tracking] apply event failed', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * The customer's browser opened the cart from the email button (the cart page calls this once it has rendered, so link
 * scanners that only fetch the link are not counted). Bots and quick repeats are ignored. Returns whether it was counted.
 */
export async function recordCartReminderClick(token: string, userAgent: string | null | undefined, now: Date = new Date()): Promise<boolean> {
  if (!isReminderToken(token) || looksLikeBot(userAgent)) return false;
  try {
    const collection = await db.getCollectionForOperations(COLLECTION);
    const result = await collection.updateOne(
      {
        'reminderEmail.token': token,
        $or: [
          { 'reminderEmail.lastClickedAt': { $exists: false } },
          { 'reminderEmail.lastClickedAt': { $lt: new Date(now.getTime() - CLICK_DEDUPE_SECONDS * 1000) } },
        ],
      },
      { $min: { 'reminderEmail.firstClickedAt': now }, $set: { 'reminderEmail.lastClickedAt': now }, $inc: { 'reminderEmail.clickCount': 1 } } as never
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.warn('[cart-reminder-tracking] record click failed', error instanceof Error ? error.message : error);
    return false;
  }
}

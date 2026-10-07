import { db } from '@/lib/server/db';

/**
 * What happened to the payment-link email of an admin-entered order and to the link in it:
 *  - `paymentLinkEmails[]`: each email sent (a new link = a new email) with what the email provider reported about it:
 *    delivered / bounced / complained / delayed, and when it was opened (a tracking pixel: only a hint, Apple Mail and
 *    some scanners load images on their own);
 *  - `paymentLinkViews`: when the customer's browser actually loaded the pay page (the reliable sign that the link was opened).
 * All of this is best effort: nothing here may ever make an order, an email or a payment fail.
 */

export type EmailStatus = 'sent' | 'delivered' | 'delayed' | 'bounced' | 'complained' | 'failed';

export interface PaymentLinkEmailRecord {
  messageId: string;
  provider?: string;
  sentAt: Date;
  status: EmailStatus;
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

export interface PaymentLinkViews {
  firstAt: Date;
  lastAt: Date;
  count: number;
}

const MAX_EMAILS_KEPT = 10;
/** Loads of the pay page closer together than this count as one (a reload, a double fire). */
const VIEW_DEDUPE_SECONDS = 15;

/** Link scanners, previewers and crawlers: they load links without a person being there. */
const BOT_AGENT = /(bot|crawl|spider|slurp|preview|scanner|facebookexternalhit|safelinks|mimecast|proofpoint|barracuda|trendmicro|symantec|python-requests|curl\/|wget|go-http-client|node-fetch|axios)/i;

export function looksLikeBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length < 8) return true;
  return BOT_AGENT.test(userAgent);
}

const COLLECTION = 'orders';

async function safely(label: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    console.warn(`[payment-link-tracking] ${label} failed`, error instanceof Error ? error.message : error);
  }
}

/** Remembers the email that was just sent for this order (newest last; the last 10 are kept). */
export async function recordPaymentLinkEmailSent(orderId: string, info: { messageId?: string; provider?: string }): Promise<void> {
  if (!info.messageId) return;
  await safely('record email sent', async () => {
    const collection = await db.getCollectionForOperations(COLLECTION);
    const entry: PaymentLinkEmailRecord = { messageId: info.messageId!, provider: info.provider, sentAt: new Date(), status: 'sent' };
    await collection.updateOne({ orderId }, { $push: { paymentLinkEmails: { $each: [entry], $slice: -MAX_EMAILS_KEPT } } } as never);
  });
}

/**
 * The customer's browser loaded the pay page of this order (called by the page itself once it has rendered, so scanners that
 * only fetch the link are not counted). Only unpaid orders are tracked; bots and quick repeats are ignored.
 * Returns whether the view was counted.
 */
export async function recordPaymentLinkView(orderId: string, userAgent: string | null | undefined, now: Date = new Date()): Promise<boolean> {
  if (looksLikeBot(userAgent)) return false;
  let counted = false;
  await safely('record view', async () => {
    const collection = await db.getCollectionForOperations(COLLECTION);
    const result = await collection.updateOne(
      {
        orderId,
        source: 'admin',
        paymentStatus: { $ne: 'paid' },
        $or: [{ 'paymentLinkViews.lastAt': { $exists: false } }, { 'paymentLinkViews.lastAt': { $lt: new Date(now.getTime() - VIEW_DEDUPE_SECONDS * 1000) } }],
      },
      { $min: { 'paymentLinkViews.firstAt': now }, $set: { 'paymentLinkViews.lastAt': now }, $inc: { 'paymentLinkViews.count': 1 } } as never
    );
    counted = result.modifiedCount > 0;
  });
  return counted;
}

// ---------------------------------------------------------------------------------------------------------------
// Events reported by the email provider (Resend webhook)

export interface EmailEventInput {
  /** e.g. 'email.delivered' */
  type: string;
  emailId: string;
  at: Date;
  bounceReason?: string;
}

/**
 * The update to apply to the matching entry of `paymentLinkEmails` for one provider event (pure, so it can be tested), or
 * null when the event type is not one we track. `set` fields use the `e.` prefix of the array filter.
 */
export function emailEventUpdate(event: EmailEventInput): { set?: Record<string, unknown>; inc?: Record<string, number>; min?: Record<string, unknown>; onlyIfStatus?: EmailStatus[] } | null {
  switch (event.type) {
    case 'email.delivered':
      // never turns a bounce or complaint back into "delivered"
      return { set: { 'e.status': 'delivered', 'e.deliveredAt': event.at }, onlyIfStatus: ['sent', 'delayed', 'delivered'] };
    case 'email.delivery_delayed':
      return { set: { 'e.status': 'delayed' }, onlyIfStatus: ['sent', 'delayed'] };
    case 'email.bounced':
      return { set: { 'e.status': 'bounced', 'e.bouncedAt': event.at, ...(event.bounceReason ? { 'e.bounceReason': event.bounceReason.slice(0, 200) } : {}) } };
    case 'email.failed':
      return { set: { 'e.status': 'failed' }, onlyIfStatus: ['sent', 'delayed'] };
    case 'email.complained':
      return { set: { 'e.status': 'complained' } };
    case 'email.opened':
      return { set: { 'e.lastOpenedAt': event.at }, min: { 'e.firstOpenedAt': event.at }, inc: { 'e.openCount': 1 } };
    case 'email.clicked':
      return { set: { 'e.lastClickedAt': event.at }, min: { 'e.firstClickedAt': event.at }, inc: { 'e.clickCount': 1 } };
    default:
      return null;
  }
}

/** Applies a provider event to the order that holds this email id. Returns false when no order has it (not a pay-link email). */
export async function applyPaymentLinkEmailEvent(event: EmailEventInput): Promise<boolean> {
  const update = emailEventUpdate(event);
  if (!update || !event.emailId) return false;
  let matched = false;
  await safely('apply email event', async () => {
    const collection = await db.getCollectionForOperations(COLLECTION);
    const ops: Record<string, unknown> = {};
    if (update.set) ops.$set = Object.fromEntries(Object.entries(update.set).map(([k, v]) => [`paymentLinkEmails.$[${k.split('.')[0]}].${k.split('.').slice(1).join('.')}`, v]));
    if (update.min) ops.$min = Object.fromEntries(Object.entries(update.min).map(([k, v]) => [`paymentLinkEmails.$[${k.split('.')[0]}].${k.split('.').slice(1).join('.')}`, v]));
    if (update.inc) ops.$inc = Object.fromEntries(Object.entries(update.inc).map(([k, v]) => [`paymentLinkEmails.$[${k.split('.')[0]}].${k.split('.').slice(1).join('.')}`, v]));
    const elementFilter: Record<string, unknown> = { 'e.messageId': event.emailId };
    if (update.onlyIfStatus) elementFilter['e.status'] = { $in: update.onlyIfStatus };
    const result = await collection.updateOne({ 'paymentLinkEmails.messageId': event.emailId }, ops as never, { arrayFilters: [elementFilter] });
    matched = result.matchedCount > 0;
  });
  return matched;
}

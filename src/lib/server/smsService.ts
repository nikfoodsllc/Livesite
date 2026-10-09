import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { smsMode } from '@/lib/sms/config';
import { SMS_CONSENT_VERSION, type SmsConsent, type SmsConsentSource } from '@/lib/sms/consent';
import { deliveryDateChangedText, welcomeText } from '@/lib/sms/messages';
import { sendViaTwilio } from '@/lib/sms/twilio';
import { getSiteUrl, isTestSite } from '@/lib/siteUrl';
import { normalizeUsPhone } from '@/lib/server/userPhone';
import { movesToTell, type ServiceResult } from '@/lib/server/orderRescheduleService';
import type { Order } from '@/types/order';

/** One line per text we tried to send (business only). Status follows the provider's delivery receipts. */
export interface SmsLogEntry {
  to: string;
  kind: 'welcome' | 'delivery_date_changed';
  body: string;
  orderId?: string;
  userId?: string;
  mode: 'dry' | 'on';
  status: string; // dry | queued | sent | delivered | undelivered | failed
  providerSid?: string;
  error?: string;
  errorCode?: number;
  createdAt: Date;
  updatedAt: Date;
}

const LOG = 'smsMessages';

async function usersCollection() {
  return db.getCollectionForOperations('users');
}

/** The customer's text-message choice, or null when they never made one. */
export async function getSmsConsent(userId: string): Promise<SmsConsent | null> {
  if (!ObjectId.isValid(userId)) return null;
  const users = await usersCollection();
  const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { smsConsent: 1 } });
  return (user?.smsConsent as SmsConsent | undefined) ?? null;
}

/** The consent only counts for the number it was given for, and only while it has not been withdrawn. */
export function canText(consent: SmsConsent | null | undefined): consent is SmsConsent & { phone: string } {
  return Boolean(consent && consent.optedIn && normalizeUsPhone(consent.phone));
}

/**
 * Saves the customer's choice. Agreeing needs a valid US phone number (it is stored with the consent); withdrawing needs
 * nothing. Returns whether this call turned texts ON (so the caller can send the one-time welcome text).
 */
export async function setSmsConsent(
  userId: string,
  choice: { optedIn: boolean; phone?: unknown; source: SmsConsentSource },
  now: Date = new Date()
): Promise<{ ok: true; optedIn: boolean; newlyOptedIn: boolean } | { ok: false; error: string }> {
  if (!ObjectId.isValid(userId)) return { ok: false, error: 'Unknown customer' };
  const users = await usersCollection();
  const _id = new ObjectId(userId);
  const current = await users.findOne({ _id }, { projection: { smsConsent: 1, role: 1 } });
  if (!current || current.role === 'admin' || current.role === 'ADMIN') return { ok: false, error: 'Unknown customer' };
  const before = (current.smsConsent as SmsConsent | undefined) ?? null;

  if (choice.optedIn) {
    const phone = normalizeUsPhone(choice.phone);
    if (!phone) return { ok: false, error: 'A 10 digit phone number is needed to get texts' };
    const unchanged = canText(before) && before.phone === phone;
    if (unchanged) return { ok: true, optedIn: true, newlyOptedIn: false };
    const next: SmsConsent = { optedIn: true, phone, optedInAt: now, source: choice.source, version: SMS_CONSENT_VERSION };
    await users.updateOne({ _id }, { $set: { smsConsent: next, updatedAt: now } });
    return { ok: true, optedIn: true, newlyOptedIn: true };
  }

  if (!before || !before.optedIn) return { ok: true, optedIn: false, newlyOptedIn: false };
  const via = choice.source === 'text_reply' ? 'text_reply' : choice.source === 'checkout' ? 'checkout' : 'profile';
  await users.updateOne({ _id }, { $set: { 'smsConsent.optedIn': false, 'smsConsent.optedOutAt': now, 'smsConsent.optedOutVia': via, updatedAt: now } });
  return { ok: true, optedIn: false, newlyOptedIn: false };
}

/** A customer replied STOP / START from their phone: mirror it on every profile that agreed for that number. */
export async function applyTextReply(phoneInput: unknown, kind: 'stop' | 'start', now: Date = new Date()): Promise<number> {
  const phone = normalizeUsPhone(phoneInput);
  if (!phone) return 0;
  const users = await usersCollection();
  if (kind === 'stop') {
    const r = await users.updateMany(
      { 'smsConsent.phone': phone, 'smsConsent.optedIn': true },
      { $set: { 'smsConsent.optedIn': false, 'smsConsent.optedOutAt': now, 'smsConsent.optedOutVia': 'text_reply', updatedAt: now } }
    );
    return r.modifiedCount;
  }
  // START: the customer asked to receive texts again from the number they had agreed for
  const r = await users.updateMany(
    { 'smsConsent.phone': phone, 'smsConsent.optedIn': false, 'smsConsent.optedOutAt': { $exists: true } },
    { $set: { 'smsConsent.optedIn': true, 'smsConsent.optedInAt': now, 'smsConsent.source': 'text_reply', 'smsConsent.version': SMS_CONSENT_VERSION, updatedAt: now }, $unset: { 'smsConsent.optedOutAt': '', 'smsConsent.optedOutVia': '' } }
  );
  return r.modifiedCount;
}

/** The provider's delivery receipt for one of our texts. */
export async function applyDeliveryReceipt(sid: string, status: string, errorCode?: string, now: Date = new Date()): Promise<void> {
  if (!sid) return;
  const log = await db.getCollectionForOperations<SmsLogEntry>(LOG);
  const set: Record<string, unknown> = { status, updatedAt: now };
  if (errorCode) set.errorCode = Number(errorCode) || undefined;
  await log.updateOne({ providerSid: sid } as never, { $set: set } as never);
}

export type SendOutcome = { ok: true; mode: 'dry' | 'on'; sid?: string } | { ok: false; status: number; error: string };

/**
 * The one place a text leaves from. Never sends to anyone without consent for exactly this number, never sends when
 * SMS_MODE is off, and in dry mode only writes the log. Test site messages are marked.
 */
export async function sendText(args: { userId: string; kind: SmsLogEntry['kind']; body: string; orderId?: string }): Promise<SendOutcome> {
  const mode = smsMode();
  if (mode === 'off') return { ok: false, status: 503, error: 'Text messages are switched off.' };
  const consent = await getSmsConsent(args.userId);
  if (!canText(consent)) return { ok: false, status: 409, error: 'The customer has not agreed to text messages.' };

  const body = isTestSite() ? `[TEST] ${args.body}` : args.body;
  const now = new Date();
  const log = await db.getCollectionForOperations<SmsLogEntry>(LOG);
  const entry: SmsLogEntry = { to: consent.phone, kind: args.kind, body, orderId: args.orderId, userId: args.userId, mode, status: 'dry', createdAt: now, updatedAt: now };
  if (mode === 'dry') {
    await log.insertOne(entry as never);
    return { ok: true, mode };
  }
  const sent = await sendViaTwilio(consent.phone, body, `${getSiteUrl()}/api/webhooks/twilio`);
  await log.insertOne({ ...entry, status: sent.ok ? sent.status || 'queued' : 'failed', providerSid: sent.sid, error: sent.error, errorCode: sent.code } as never);
  if (!sent.ok) {
    // 21610 = the customer replied STOP to our number: mirror it so the admin sees they cannot be texted
    if (sent.code === 21610) await applyTextReply(consent.phone, 'stop');
    return { ok: false, status: sent.code === 21610 ? 409 : 502, error: sent.code === 21610 ? 'The customer has stopped text messages.' : sent.error || 'The text could not be sent.' };
  }
  return { ok: true, mode, sid: sent.sid };
}

/** The one-time confirmation after a customer agrees. Best effort: never makes a checkout or profile save fail. */
export async function sendWelcomeText(userId: string): Promise<void> {
  try {
    const result = await sendText({ userId, kind: 'welcome', body: welcomeText() });
    if (!result.ok && result.status !== 503) console.warn('[sms] welcome text not sent', result.error);
  } catch (error) {
    console.warn('[sms] welcome text failed', error instanceof Error ? error.message : error);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Admin: "delivery date changed" text for a moved order

export interface RescheduleSmsRecord {
  sentAt: Date;
  by: { id: string; name?: string };
  providerSid?: string;
  mode: 'dry' | 'on';
  count: number;
}

export async function sendRescheduleSms(orderId: string, adminId: string, now: Date = new Date()): Promise<ServiceResult<{ orderId: string; sentAt: string; mode: 'dry' | 'on' }>> {
  if (smsMode() === 'off') return { ok: false, status: 503, error: 'Text messages are switched off.' };
  const found = await db.readOne<Order & { reschedules?: unknown[]; rescheduleSms?: RescheduleSmsRecord; user?: string }>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order) return { ok: false, status: 404, error: 'Order not found.' };
  if (!order.reschedules || order.reschedules.length === 0) return { ok: false, status: 409, error: 'This order has not been moved to another date.' };
  if (order.status === 'cancelled') return { ok: false, status: 409, error: 'This order is cancelled.' };
  const moves = movesToTell(order as never);
  if (moves.length === 0) return { ok: false, status: 409, error: 'The delivery dates are back to the original ones, so there is nothing to tell the customer.' };
  const userId = String(order.user ?? '');
  if (!userId) return { ok: false, status: 409, error: 'The order has no customer account.' };

  const collection = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  // one text at a time per order: a double click sends one
  const claimed = await collection.updateOne(
    { orderId, $or: [{ rescheduleSmsLock: { $exists: false } }, { 'rescheduleSmsLock.at': { $lt: new Date(now.getTime() - 60_000) } }] } as never,
    { $set: { rescheduleSmsLock: { at: now } } } as never
  );
  if (!claimed.modifiedCount) return { ok: false, status: 409, error: 'A text is already being sent for this order.' };
  try {
    const link = `${getSiteUrl()}/account/orders?order=${encodeURIComponent(String(order.orderId).replace(/^#/, ''))}`;
    const sent = await sendText({ userId, kind: 'delivery_date_changed', body: deliveryDateChangedText(String(order.orderId), moves, link), orderId });
    if (!sent.ok) return sent;
    let name: string | undefined;
    if (ObjectId.isValid(adminId)) {
      const admin = await db.readOne<{ name?: string; email?: string }>('users', { _id: new ObjectId(adminId) } as never);
      name = admin.success ? admin.data?.name || admin.data?.email : undefined;
    }
    const record: RescheduleSmsRecord = { sentAt: now, by: { id: adminId, name }, providerSid: sent.sid, mode: sent.mode, count: (order.rescheduleSms?.count ?? 0) + 1 };
    await collection.updateOne({ orderId } as never, { $set: { rescheduleSms: record } } as never);
    return { ok: true, orderId, sentAt: now.toISOString(), mode: sent.mode };
  } finally {
    await collection.updateOne({ orderId } as never, { $unset: { rescheduleSmsLock: '' } } as never).catch(() => undefined);
  }
}

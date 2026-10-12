import { randomBytes } from 'crypto';
import type { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { findClosedLines } from '@/lib/server/availableDates';
import { isTestSite } from '@/lib/siteUrl';
import { sendCartReminderEmail } from '@/lib/cartReminderEmail';
import type { CheckoutDraft } from '@/lib/server/checkoutDrafts';
import type { ReminderEmailRecord } from '@/lib/server/cartReminderTracking';

/**
 * The automatic cart reminder: about 30 minutes after someone leaves checkout without paying, one email brings them back to
 * their cart (the button restores the saved items, see lib/server/cartRestore.ts). Run by /api/cron/cart-reminders every
 * 5 minutes. What happens to the email is written on the draft (`reminderEmail`, lib/server/cartReminderTracking.ts).
 *
 * Switch CART_REMINDER = off (default) | dry (only counts who would get one) | on.
 * On the test site (livesite-dev) nobody is emailed unless CART_REMINDER_ALLOW lists the addresses (comma separated, an
 * address or a part of one), so old test and copied data can never be emailed.
 *
 * Rules, per customer: only their newest open checkout counts; it has to be untouched for 30 minutes and no older than 24
 * hours; it has the customer's email and its saved items; they did not press Pay (a failed payment already has its own
 * email); nobody reached out from the admin and it was not dismissed; at least one delivery day is still open; one
 * reminder per cart and none to the same customer within 14 days.
 */

const COLLECTION = 'checkoutDrafts';
export const REMINDER_AFTER_MINUTES = 30;
export const REMINDER_MAX_AGE_HOURS = 24;
export const REMINDER_GAP_DAYS = 14;
export const REMINDER_MAX_ATTEMPTS = 3;
const MAX_PER_RUN = 20;

export type ReminderMode = 'off' | 'dry' | 'on';
export function reminderMode(env: Record<string, string | undefined> = process.env): ReminderMode {
  const v = (env.CART_REMINDER ?? '').trim().toLowerCase();
  return v === 'on' || v === 'dry' ? v : 'off';
}

export type ReminderDraft = Pick<CheckoutDraft, 'userId' | 'customer' | 'status' | 'orderId' | 'contacted' | 'dismissedAt' | 'lastActivityAt'> & {
  _id?: ObjectId;
  items?: unknown[];
  cartLines?: unknown[];
  total?: number;
  reminderEmail?: Partial<ReminderEmailRecord>;
};

const personKey = (d: ReminderDraft) => (d.userId ? `u:${d.userId}` : `e:${(d.customer?.email ?? '').toLowerCase()}`);
const emailKey = (email?: string) => `e:${(email ?? '').trim().toLowerCase()}`;

/** Who should get a reminder now (pure, so it can be tested). `recent` holds the people already reminded in the last 14 days. */
export function pickReminderTargets(drafts: ReminderDraft[], now: Date, recent: Set<string>): ReminderDraft[] {
  const newest = new Map<string, ReminderDraft>();
  for (const d of drafts) {
    if (d.status !== 'open') continue;
    const key = personKey(d);
    const seen = newest.get(key);
    if (!seen || new Date(d.lastActivityAt).getTime() > new Date(seen.lastActivityAt).getTime()) newest.set(key, d);
  }
  const minAge = REMINDER_AFTER_MINUTES * 60_000;
  const maxAge = REMINDER_MAX_AGE_HOURS * 3_600_000;
  const out: ReminderDraft[] = [];
  for (const d of newest.values()) {
    const age = now.getTime() - new Date(d.lastActivityAt).getTime();
    if (age < minAge || age > maxAge) continue;
    const email = (d.customer?.email ?? '').trim();
    if (!email || !email.includes('@')) continue;
    if (d.orderId || d.contacted || d.dismissedAt) continue;
    if (!d.cartLines || d.cartLines.length === 0 || !d.items || d.items.length === 0) continue;
    const r = d.reminderEmail;
    if (r && !(r.status === 'failed' && (r.attempts ?? 0) < REMINDER_MAX_ATTEMPTS)) continue;
    if (recent.has(personKey(d)) || recent.has(emailKey(email))) continue;
    out.push(d);
  }
  return out.sort((a, b) => new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime());
}

/** On the test site: only the addresses named in CART_REMINDER_ALLOW (none when it is empty). */
export function allowedOnTestSite(email: string, env: Record<string, string | undefined> = process.env): boolean {
  if (!isTestSite(env)) return true;
  const allow = (env.CART_REMINDER_ALLOW ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const e = email.trim().toLowerCase();
  return allow.some((a) => e.includes(a));
}

type DraftCollection = Awaited<ReturnType<typeof db.getCollectionForOperations<ReminderDraft & Record<string, unknown>>>>;

export type ReminderOutcome = { status: 'sent' } | { status: 'failed'; error: string } | { status: 'not_claimed' };

/**
 * Claims the cart (so two runs, or a run and an admin, can never both send), sends the reminder and writes what happened on the
 * draft. `by` is the admin's id when an admin pressed Email in Abandoned Checkout.
 */
export async function claimAndSendReminder(collection: DraftCollection, d: ReminderDraft, now: Date, by?: string): Promise<ReminderOutcome> {
  const token = randomBytes(24).toString('hex');
  const claimed = await collection.updateOne(
    {
      _id: d._id,
      status: 'open',
      $or: [{ reminderEmail: { $exists: false } }, { 'reminderEmail.status': 'failed', 'reminderEmail.attempts': { $lt: REMINDER_MAX_ATTEMPTS } }],
    } as never,
    { $set: { 'reminderEmail.status': 'claimed', 'reminderEmail.claimedAt': now, 'reminderEmail.token': token, ...(by ? { 'reminderEmail.sentBy': by } : { }) }, $inc: { 'reminderEmail.attempts': 1 } } as never
  );
  if (claimed.modifiedCount === 0) return { status: 'not_claimed' };
  const sent = await sendCartReminderEmail(d.customer!.email!, {
    name: d.customer?.name,
    items: d.items as never,
    total: Number(d.total) || 0,
    trackingToken: token,
  });
  if (sent.success) {
    const at = new Date();
    await collection.updateOne(
      { _id: d._id } as never,
      { $set: { 'reminderEmail.status': 'sent', 'reminderEmail.sentAt': at, 'reminderEmail.messageId': sent.messageId ?? null, 'reminderEmail.provider': sent.provider ?? null, reminderEmailSentAt: at }, $unset: { 'reminderEmail.error': '' } } as never
    );
    return { status: 'sent' };
  }
  const error = String(sent.error ?? 'Email failed').slice(0, 200);
  await collection.updateOne({ _id: d._id } as never, { $set: { 'reminderEmail.status': 'failed', 'reminderEmail.error': error } } as never);
  return { status: 'failed', error };
}

export type ManualReminderResult =
  | { ok: true }
  | { ok: false; code: 'not_found' | 'no_email' | 'no_items' | 'already_sent' | 'held_back' | 'send_failed'; message: string };

/**
 * An admin pressed Email on a person in Abandoned Checkout: send the same reminder now, without waiting for the 30 minutes.
 * Only an open checkout with an email and saved items; one reminder per cart (it shows what happened to the first).
 */
export async function sendReminderNow(paymentIntentId: string, adminId: string): Promise<ManualReminderResult> {
  const collection = await db.getCollectionForOperations<ReminderDraft & Record<string, unknown>>(COLLECTION);
  const d = await collection.findOne({ paymentIntentId, status: 'open' } as never, {
    projection: { userId: 1, customer: 1, status: 1, orderId: 1, contacted: 1, dismissedAt: 1, lastActivityAt: 1, total: 1, items: 1, cartLines: 1, reminderEmail: 1 },
  });
  if (!d) return { ok: false, code: 'not_found', message: 'This checkout is no longer open.' };
  const email = (d.customer?.email ?? '').trim();
  if (!email.includes('@')) return { ok: false, code: 'no_email', message: 'No email saved for this person.' };
  if (!d.items || d.items.length === 0 || !d.cartLines || d.cartLines.length === 0) {
    return { ok: false, code: 'no_items', message: 'This checkout has no saved items, so the reminder cannot be built.' };
  }
  if (!allowedOnTestSite(email)) return { ok: false, code: 'held_back', message: 'On the test site only addresses in the allow list can be emailed.' };
  const r = d.reminderEmail;
  if (r && !(r.status === 'failed' && (r.attempts ?? 0) < REMINDER_MAX_ATTEMPTS)) {
    return { ok: false, code: 'already_sent', message: 'A reminder was already sent for this checkout.' };
  }
  const outcome = await claimAndSendReminder(collection, d, new Date(), adminId);
  if (outcome.status === 'sent') return { ok: true };
  if (outcome.status === 'not_claimed') return { ok: false, code: 'already_sent', message: 'A reminder was already sent for this checkout.' };
  return { ok: false, code: 'send_failed', message: `The email could not be sent: ${outcome.error}` };
}

export interface ReminderRunResult {
  mode: ReminderMode;
  checked: number;
  eligible: number;
  /** eligible but every delivery day in the cart has closed */
  allDaysClosed: number;
  /** eligible but held back on the test site (not in CART_REMINDER_ALLOW) */
  heldBack: number;
  sent: number;
  failed: number;
  skippedClaimed: number;
}

export async function runCartReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const mode = reminderMode();
  const result: ReminderRunResult = { mode, checked: 0, eligible: 0, allDaysClosed: 0, heldBack: 0, sent: 0, failed: 0, skippedClaimed: 0 };
  if (mode === 'off') return result;

  const collection = await db.getCollectionForOperations<ReminderDraft & Record<string, unknown>>(COLLECTION);
  const since = new Date(now.getTime() - REMINDER_MAX_AGE_HOURS * 3_600_000);
  const drafts = await collection
    .find({ status: 'open', lastActivityAt: { $gte: since } } as never, {
      projection: { userId: 1, customer: 1, status: 1, orderId: 1, contacted: 1, dismissedAt: 1, lastActivityAt: 1, total: 1, items: 1, cartLines: 1, reminderEmail: 1 },
    })
    .sort({ lastActivityAt: -1 })
    .limit(500)
    .toArray();
  result.checked = drafts.length;

  const gapSince = new Date(now.getTime() - REMINDER_GAP_DAYS * 24 * 3_600_000);
  const reminded = await collection
    .find({ 'reminderEmail.claimedAt': { $gte: gapSince }, 'reminderEmail.status': { $ne: 'failed' } } as never, { projection: { userId: 1, customer: 1 } })
    .limit(2000)
    .toArray();
  // a reminder that failed to send does not count: it is retried (up to 3 times)
  const recent = new Set<string>();
  for (const r of reminded) {
    recent.add(personKey(r));
    if (r.customer?.email) recent.add(emailKey(r.customer.email));
  }

  let targets = pickReminderTargets(drafts, now, recent);
  result.eligible = targets.length;

  // keep the ones that still have a delivery day open to order
  const withOpenDay: ReminderDraft[] = [];
  for (const d of targets) {
    const lines = (d.cartLines ?? []) as Array<{ date: string; listingType?: 'flat' | 'day-wise'; foodItem: { _id?: unknown; name?: unknown } }>;
    const closed = await findClosedLines(lines.map((l) => ({ date: l.date, foodItemId: l.foodItem?._id, kind: l.listingType, name: String(l.foodItem?.name ?? '') })));
    const isClosed = (l: (typeof lines)[number]) => closed.some((c) => c.date === l.date && (!c.foodItemId || c.foodItemId === String(l.foodItem?._id)));
    if (lines.every(isClosed)) result.allDaysClosed += 1;
    else withOpenDay.push(d);
  }
  targets = withOpenDay.filter((d) => {
    if (allowedOnTestSite(d.customer?.email ?? '')) return true;
    result.heldBack += 1;
    return false;
  });
  if (mode === 'dry') return result;

  for (const d of targets.slice(0, MAX_PER_RUN)) {
    const outcome = await claimAndSendReminder(collection, d, now);
    if (outcome.status === 'sent') result.sent += 1;
    else if (outcome.status === 'failed') result.failed += 1;
    else result.skippedClaimed += 1;
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Resend allows about 2 sends a second; the team copy is one more
  }
  return result;
}

import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { smsMode } from '@/lib/sms/config';
import { getSmsConsent, canText, sendText } from '@/lib/server/smsService';
import { normalizeUsPhone } from '@/lib/server/userPhone';
import type { SmsConsent } from '@/lib/sms/consent';
import { sendCommunicationEmail, unsubscribeUrlFor } from '@/lib/communicationEmail';
import { optedOutEmails } from '@/lib/server/emailOptOut';
import type { EmailEventInput } from '@/lib/server/paymentLinkTracking';
import {
  checkMessage,
  firstNameOf,
  ordersQuery,
  parseAudienceFilter,
  parseEmailFormat,
  renderHtmlMessage,
  renderMessage,
  textsAllowedAt,
  type AudienceFilter,
  type EmailFormat,
  type MessageContext,
} from '@/lib/communications/rules';

/**
 * Communication tab (admin): send a message to the customers a filter picks, by email and/or text.
 *
 * Collections
 *   communications          one document per message an admin sent or scheduled
 *   communicationRecipients one document per customer and channel (unique on campaignId + key + channel), with what happened to it
 *
 * Safety rules built in: one message per customer and channel per campaign (unique index), a recipient is claimed before it is
 * sent so two runners never send the same one, an interrupted recipient is marked failed and never re-sent, a lease stops two
 * runners working on one campaign, texts only go to customers who agreed and only 8 AM to 9 PM Pacific, and a stopped campaign
 * sends nothing more.
 */

const CAMPAIGNS = 'communications';
const RECIPIENTS = 'communicationRecipients';

export type CampaignStatus = 'scheduled' | 'sending' | 'done' | 'cancelled';
export type RecipientStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'delayed' | 'bounced' | 'complained' | 'failed' | 'skipped';
export type Channel = 'email' | 'text';

export interface Campaign {
  _id: ObjectId;
  filter: AudienceFilter;
  channels: { email: boolean; text: boolean };
  subject: string;
  emailBody: string;
  /** 'html' = the admin's own HTML is sent as it is (placeholders filled), 'text' = plain text in the NikFoods shell */
  emailFormat?: EmailFormat;
  textBody: string;
  excludeKeys: string[];
  scheduledFor?: Date;
  status: CampaignStatus;
  createdAt: Date;
  createdBy: { id: string; name?: string };
  startedAt?: Date;
  finishedAt?: Date;
  lease?: Date;
  /** how many customers the filter found when it ran */
  audienceSize?: number;
}

export interface RecipientDoc {
  campaignId: ObjectId;
  key: string;
  channel: Channel;
  userId?: string;
  name: string;
  firstName: string;
  email?: string;
  phone?: string;
  orderIds: string[];
  status: RecipientStatus;
  reason?: string;
  error?: string;
  messageId?: string;
  sid?: string;
  dry?: boolean;
  claimedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  bouncedAt?: Date;
  firstOpenedAt?: Date;
  openCount?: number;
}

async function campaigns() {
  const c = await db.getCollectionForOperations<Campaign & Record<string, unknown>>(CAMPAIGNS);
  return c;
}
async function recipients() {
  const c = await db.getCollectionForOperations<RecipientDoc & Record<string, unknown>>(RECIPIENTS);
  await c.createIndex({ campaignId: 1, key: 1, channel: 1 }, { unique: true }).catch(() => undefined);
  await c.createIndex({ messageId: 1 }, { sparse: true }).catch(() => undefined);
  await c.createIndex({ sid: 1 }, { sparse: true }).catch(() => undefined);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// The audience

export interface AudienceCustomer {
  key: string;
  userId?: string;
  name: string;
  email: string | null;
  /** the number a text would go to (from the customer's text agreement), else the order's number */
  phone: string | null;
  orderIds: string[];
  textOk: boolean;
  textReason?: string;
  /** on the unsubscribe list: no emails go to this customer */
  unsubscribed?: boolean;
  /** added by hand on top of the filter (the filter would not have found this customer) */
  added?: boolean;
}

const digits10 = (v: unknown): string | null => {
  const d = String(v ?? '').replace(/\D/g, '');
  const t = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return t.length === 10 ? t : null;
};
/** An address we can really send to (copied test orders carry example.invalid). */
export function usableEmail(v: unknown): string | null {
  const e = String(v ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  if (e.endsWith('.invalid') || e.endsWith('@example.com') || e.endsWith('@example.org')) return null;
  return e;
}

interface OrderRow {
  orderId?: string;
  user?: unknown;
  customerInfo?: { name?: string; email?: string; phone?: string };
  createdAt?: Date;
}

interface UserRow {
  _id: ObjectId;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  smsConsent?: SmsConsent;
}

/** Customers named by hand, or everyone with an account. No orders are involved. Text consent is read in one go. */
async function loadAccounts(filter: AudienceFilter): Promise<AudienceCustomer[]> {
  const users = await db.getCollectionForOperations<Record<string, unknown>>('users');
  const query: Record<string, unknown> =
    filter.kind === 'people'
      ? { _id: { $in: (filter.userIds ?? []).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) }, role: { $in: ['USER', 'user'] } }
      : { role: { $in: ['USER', 'user'] }, isActive: { $ne: false } };
  const rows = (await users.find(query as never, { projection: { name: 1, fullName: 1, email: 1, phone: 1, smsConsent: 1 } }).limit(6000).toArray()) as unknown as UserRow[];
  const subscribers = await db.getCollectionForOperations<Record<string, unknown>>('smsSubscribers');
  const agreed = new Set(((await subscribers.find({ optedIn: true } as never, { projection: { phone: 1 } }).limit(20000).toArray()) as unknown as Array<{ phone?: string }>).map((s) => String(s.phone ?? '')));
  return rows
    .map((u): AudienceCustomer => {
      const profilePhone = normalizeUsPhone(u.phone);
      const own = u.smsConsent ?? null;
      let textOk = false;
      let phone = profilePhone;
      let textReason: string | undefined;
      if (canText(own)) {
        textOk = true;
        phone = own.phone;
      } else if (profilePhone && agreed.has(profilePhone)) {
        textOk = true;
      } else textReason = own && !own.optedIn ? 'Stopped texts' : 'Has not agreed to texts';
      return { key: String(u._id), userId: String(u._id), name: String(u.name ?? u.fullName ?? '').trim(), email: usableEmail(u.email), phone: phone ?? digits10(u.phone), orderIds: [], textOk, ...(textReason ? { textReason } : {}) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Everyone who agreed to get emails from us: the menu alerts list (active, consent given). A customer with an account shows under the
 * account; someone who only left an email shows by that email. Texts need their own agreement, so none of these can be texted here.
 */
async function loadSubscribers(): Promise<AudienceCustomer[]> {
  const subs = await db.getCollectionForOperations<Record<string, unknown>>('menu_subscriptions');
  const list = (await subs.find({ isActive: true, consentGiven: true } as never, { projection: { email: 1, userId: 1 } }).limit(20000).toArray()) as unknown as Array<{ email?: string; userId?: string }>;
  const users = await db.getCollectionForOperations<Record<string, unknown>>('users');
  const emails = [...new Set(list.map((s) => String(s.email ?? '').trim().toLowerCase()).filter(Boolean))];
  const ids = [...new Set(list.map((s) => String(s.userId ?? '')).filter((id) => ObjectId.isValid(id)))].map((id) => new ObjectId(id));
  const accounts = (await users
    .find({ $or: [{ email: { $in: emails } }, ...(ids.length ? [{ _id: { $in: ids } }] : [])] } as never, { projection: { name: 1, fullName: 1, email: 1, phone: 1 } })
    .limit(30000)
    .toArray()) as unknown as UserRow[];
  const byId = new Map(accounts.map((u) => [String(u._id), u]));
  const byEmail = new Map(accounts.map((u) => [String(u.email ?? '').trim().toLowerCase(), u]));
  const seen = new Map<string, AudienceCustomer>();
  for (const s of list) {
    const email = usableEmail(s.email);
    const account = (s.userId && byId.get(String(s.userId))) || byEmail.get(String(s.email ?? '').trim().toLowerCase());
    const key = account ? String(account._id) : email;
    if (!key || seen.has(key)) continue;
    seen.set(key, {
      key,
      userId: account ? String(account._id) : undefined,
      name: account ? String(account.name ?? account.fullName ?? '').trim() : '',
      email: email ?? usableEmail(account?.email),
      phone: account ? digits10(account.phone) : null,
      orderIds: [],
      textOk: false,
      textReason: 'Agreed to emails only',
    });
  }
  return [...seen.values()].sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '', undefined, { sensitivity: 'base' }));
}

/** The customers of a filter, each marked when their address is on the unsubscribe list. */
export async function loadAudience(filter: AudienceFilter): Promise<AudienceCustomer[]> {
  const customers = await loadAudienceRaw(filter);
  // customers added by hand come on top of the filter, whatever it says (one already found by the filter stays as it is)
  if (filter.kind !== 'people' && (filter.alsoUserIds ?? []).length > 0) {
    const have = new Set(customers.map((c) => c.userId ?? c.key));
    const extras = await loadAccounts({ kind: 'people', userIds: filter.alsoUserIds });
    for (const e of extras) if (!have.has(e.userId ?? e.key)) customers.push({ ...e, added: true });
    customers.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
  const stopped = await optedOutEmails(customers.map((c) => c.email ?? ''));
  for (const c of customers) if (c.email && stopped.has(c.email.toLowerCase())) c.unsubscribed = true;
  return customers;
}

/** One row per customer (an account, else the order's email or phone) with the orders that matched. */
async function loadAudienceRaw(filter: AudienceFilter): Promise<AudienceCustomer[]> {
  if (filter.kind === 'people' || filter.kind === 'all') return loadAccounts(filter);
  if (filter.kind === 'subscribers') return loadSubscribers();
  const orders = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  const rows = (await orders
    .find(ordersQuery(filter) as never, { projection: { orderId: 1, user: 1, customerInfo: 1, createdAt: 1 } })
    .sort({ createdAt: 1 })
    .limit(5000)
    .toArray()) as unknown as OrderRow[];

  const byKey = new Map<string, AudienceCustomer>();
  for (const o of rows) {
    const userId = o.user ? String(o.user) : '';
    const email = usableEmail(o.customerInfo?.email);
    const phone = digits10(o.customerInfo?.phone);
    const key = userId || email || phone || '';
    if (!key || !o.orderId) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { key, userId: userId || undefined, name: String(o.customerInfo?.name ?? '').trim(), email, phone, orderIds: [o.orderId], textOk: false });
    } else {
      existing.orderIds.push(o.orderId);
      // the newest order's details win
      if (o.customerInfo?.name?.trim()) existing.name = o.customerInfo.name.trim();
      if (email) existing.email = email;
      if (phone) existing.phone = phone;
    }
  }

  const customers = [...byKey.values()];
  // text agreement: per account, checked a few at a time
  for (let i = 0; i < customers.length; i += 20) {
    await Promise.all(
      customers.slice(i, i + 20).map(async (c) => {
        if (!c.userId) {
          c.textReason = 'No account';
          return;
        }
        const consent = await getSmsConsent(c.userId).catch(() => null);
        if (canText(consent)) {
          c.textOk = true;
          c.phone = consent.phone;
        } else c.textReason = consent && !consent.optedIn ? 'Stopped texts' : 'Has not agreed to texts';
      })
    );
  }
  return customers.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

// ---------------------------------------------------------------------------------------------------------------
// Creating and starting a campaign

export interface CreateArgs {
  filter: unknown;
  email: boolean;
  text: boolean;
  subject: unknown;
  emailBody: unknown;
  emailFormat?: unknown;
  textBody: unknown;
  excludeKeys?: unknown;
  scheduledFor?: unknown;
  admin: { id: string; name?: string };
}

export type CreateResult = { ok: true; id: string; status: CampaignStatus; recipients?: Record<string, number> } | { ok: false; status: number; error: string };

const MAX_SCHEDULE_DAYS = 60;

export async function createCampaign(args: CreateArgs, now: Date = new Date()): Promise<CreateResult> {
  const parsed = parseAudienceFilter(args.filter);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const emailFormat = parseEmailFormat(args.emailFormat);
  const problem = checkMessage({ email: args.email, text: args.text, subject: args.subject, emailBody: args.emailBody, textBody: args.textBody, emailFormat }, parsed.filter);
  if (problem) return { ok: false, status: 400, error: problem.error };
  if (args.text && smsMode() === 'off') return { ok: false, status: 409, error: 'Text messages are not switched on yet.' };

  let scheduledFor: Date | undefined;
  if (args.scheduledFor !== undefined && args.scheduledFor !== null && args.scheduledFor !== '') {
    const at = new Date(String(args.scheduledFor));
    if (Number.isNaN(at.getTime())) return { ok: false, status: 400, error: 'Pick a real date and time to send.' };
    if (at.getTime() < now.getTime() + 2 * 60_000) return { ok: false, status: 400, error: 'Pick a time at least a few minutes from now.' };
    if (at.getTime() > now.getTime() + MAX_SCHEDULE_DAYS * 86_400_000) return { ok: false, status: 400, error: `Pick a time within ${MAX_SCHEDULE_DAYS} days.` };
    scheduledFor = at;
  }

  const excludeKeys = Array.isArray(args.excludeKeys) ? args.excludeKeys.filter((k): k is string => typeof k === 'string').slice(0, 5000) : [];
  const doc: Omit<Campaign, '_id'> = {
    filter: parsed.filter,
    channels: { email: args.email, text: args.text },
    subject: String(args.subject ?? '').trim(),
    emailBody: String(args.emailBody ?? '').trim(),
    emailFormat,
    textBody: String(args.textBody ?? '').trim(),
    excludeKeys,
    ...(scheduledFor ? { scheduledFor } : {}),
    status: scheduledFor ? 'scheduled' : 'sending',
    createdAt: now,
    createdBy: args.admin,
    ...(scheduledFor ? {} : { startedAt: now }),
  };
  const col = await campaigns();
  const inserted = await col.insertOne(doc as never);
  const id = inserted.insertedId as ObjectId;
  if (scheduledFor) return { ok: true, id: String(id), status: 'scheduled' };

  const counts = await prepareRecipients({ ...(doc as Campaign), _id: id });
  if (counts.total === 0) {
    await col.updateOne({ _id: id } as never, { $set: { status: 'done', finishedAt: now, audienceSize: 0 } } as never);
    return { ok: false, status: 409, error: 'There is nobody to send to with this filter.' };
  }
  return { ok: true, id: String(id), status: 'sending', recipients: counts.byChannel };
}

/** Finds the customers now and writes one recipient per customer and channel. Safe to run again (unique index). */
export async function prepareRecipients(campaign: Campaign): Promise<{ total: number; byChannel: Record<string, number> }> {
  const audience = (await loadAudience(campaign.filter)).filter((c) => !campaign.excludeKeys.includes(c.key));
  const docs: RecipientDoc[] = [];
  for (const c of audience) {
    const base = { campaignId: campaign._id, key: c.key, userId: c.userId, name: c.name, firstName: firstNameOf(c.name), orderIds: c.orderIds };
    if (campaign.channels.email) {
      docs.push(!c.email ? { ...base, channel: 'email', status: 'skipped', reason: 'No email address' } : c.unsubscribed ? { ...base, channel: 'email', email: c.email, status: 'skipped', reason: 'Unsubscribed' } : { ...base, channel: 'email', email: c.email, status: 'queued' });
    }
    if (campaign.channels.text) {
      docs.push(c.textOk && c.phone ? { ...base, channel: 'text', phone: c.phone, status: 'queued' } : { ...base, channel: 'text', ...(c.phone ? { phone: c.phone } : {}), status: 'skipped', reason: c.textReason ?? 'Has not agreed to texts' });
    }
  }
  const col = await recipients();
  if (docs.length) await col.insertMany(docs as never[], { ordered: false }).catch(() => undefined);
  const campaignsCol = await campaigns();
  await campaignsCol.updateOne({ _id: campaign._id } as never, { $set: { audienceSize: audience.length } } as never);
  const byChannel: Record<string, number> = {};
  for (const d of docs) if (d.status === 'queued') byChannel[d.channel] = (byChannel[d.channel] ?? 0) + 1;
  return { total: docs.length, byChannel };
}

// ---------------------------------------------------------------------------------------------------------------
// Sending

const EMAIL_GAP_MS = 650; // Resend allows about 2 sends a second
const TEXT_GAP_MS = 1100; // a long-code number sends about 1 text a second
const LEASE_MS = 5 * 60_000;
const STUCK_MS = 3 * 60_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function contextOf(campaign: Campaign, r: RecipientDoc): MessageContext {
  return { firstName: r.firstName, orderNumber: (r.orderIds[0] ?? '').replace(/^#/, ''), date: campaign.filter.date ?? '' };
}

/**
 * Works through the queued recipients of one campaign for up to `budgetMs`. Returns how many it sent. Only one runner works on a
 * campaign at a time (a lease), and every recipient is claimed before it is sent.
 */
export async function processCampaign(id: string, budgetMs = 240_000, now: () => Date = () => new Date()): Promise<{ sent: number; failed: number; left: number }> {
  const started = Date.now();
  const col = await campaigns();
  const rec = await recipients();
  const _id = new ObjectId(id);
  const t0 = now();
  const got = await col.findOneAndUpdate(
    { _id, status: 'sending', $or: [{ lease: { $exists: false } }, { lease: { $lt: t0 } }] } as never,
    { $set: { lease: new Date(t0.getTime() + LEASE_MS) } } as never,
    { returnDocument: 'after' }
  );
  const campaign = (got as unknown as Campaign | null) ?? null;
  if (!campaign) return { sent: 0, failed: 0, left: -1 };

  // a recipient left "sending" by a run that died may or may not have been sent: never send it again
  await rec.updateMany({ campaignId: _id, status: 'sending', claimedAt: { $lt: new Date(t0.getTime() - STUCK_MS) } } as never, { $set: { status: 'failed', error: 'Interrupted: not sent again to be safe' } } as never);

  let sent = 0;
  let failed = 0;
  let checks = 0;
  try {
    while (Date.now() - started < budgetMs) {
      // a stopped campaign sends nothing more
      if (checks++ % 10 === 0) {
        const fresh = await col.findOne({ _id } as never, { projection: { status: 1 } });
        if (!fresh || (fresh as unknown as Campaign).status !== 'sending') break;
      }
      const textsOpen = textsAllowedAt(now());
      const claimed = await rec.findOneAndUpdate(
        { campaignId: _id, status: 'queued', ...(textsOpen ? {} : { channel: 'email' }) } as never,
        { $set: { status: 'sending', claimedAt: now() } } as never,
        { sort: { channel: 1, _id: 1 }, returnDocument: 'after' }
      );
      const r = (claimed as unknown as RecipientDoc & { _id: ObjectId }) ?? null;
      if (!r) break;
      const ctx = contextOf(campaign, r);
      if (r.channel === 'email') {
        // someone may have unsubscribed after the message was prepared (a long send, or one scheduled earlier)
        if ((await optedOutEmails([r.email ?? ''])).size > 0) {
          await rec.updateOne({ _id: (r as never as { _id: ObjectId })._id } as never, { $set: { status: 'skipped', reason: 'Unsubscribed' } } as never);
          continue;
        }
        const result = await sendCommunicationEmail({ to: r.email!, subject: renderMessage(campaign.subject, ctx), text: campaign.emailFormat === 'html' ? renderHtmlMessage(campaign.emailBody, ctx) : renderMessage(campaign.emailBody, ctx), format: campaign.emailFormat === 'html' ? 'html' : 'text', unsubscribeUrl: unsubscribeUrlFor(r.email!) });
        if (result.success) {
          sent++;
          await rec.updateOne({ _id: (r as never as { _id: ObjectId })._id } as never, { $set: { status: 'sent', sentAt: now(), messageId: result.messageId } } as never);
        } else {
          failed++;
          await rec.updateOne({ _id: (r as never as { _id: ObjectId })._id } as never, { $set: { status: 'failed', error: String(result.error ?? 'Email failed').slice(0, 200) } } as never);
        }
        await sleep(EMAIL_GAP_MS);
      } else {
        const result = await sendText({ userId: r.userId ?? '', kind: 'announcement', body: renderMessage(campaign.textBody, ctx), orderId: r.orderIds[0] });
        if (result.ok) {
          sent++;
          await rec.updateOne({ _id: (r as never as { _id: ObjectId })._id } as never, { $set: { status: 'sent', sentAt: now(), dry: result.mode === 'dry', ...(result.sid ? { sid: result.sid } : {}) } } as never);
        } else {
          failed++;
          await rec.updateOne({ _id: (r as never as { _id: ObjectId })._id } as never, { $set: { status: 'failed', error: result.error.slice(0, 200) } } as never);
        }
        await sleep(TEXT_GAP_MS);
      }
    }
  } finally {
    const left = await rec.countDocuments({ campaignId: _id, status: { $in: ['queued', 'sending'] } } as never);
    const fresh = await col.findOne({ _id } as never, { projection: { status: 1 } });
    const stillRunning = fresh && (fresh as unknown as Campaign).status === 'sending';
    await col.updateOne(
      { _id } as never,
      left === 0 && stillRunning ? ({ $set: { status: 'done', finishedAt: now() }, $unset: { lease: '' } } as never) : ({ $unset: { lease: '' } } as never)
    );
  }
  const left = await rec.countDocuments({ campaignId: _id, status: 'queued' } as never);
  return { sent, failed, left };
}

/** Stops a scheduled or running campaign. Whatever is still waiting is not sent. */
export async function cancelCampaign(id: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!ObjectId.isValid(id)) return { ok: false, status: 404, error: 'Not found.' };
  const col = await campaigns();
  const result = await col.findOneAndUpdate({ _id: new ObjectId(id), status: { $in: ['scheduled', 'sending'] } } as never, { $set: { status: 'cancelled', finishedAt: new Date() } } as never);
  if (!result) return { ok: false, status: 409, error: 'This message has already finished or was stopped.' };
  const rec = await recipients();
  await rec.updateMany({ campaignId: new ObjectId(id), status: 'queued' } as never, { $set: { status: 'skipped', reason: 'Stopped before it was sent' } } as never);
  return { ok: true };
}

/** The cron step: start scheduled messages that are due, and carry on with running ones (for example texts waiting for 8 AM). */
export async function runDueCampaigns(now: Date = new Date(), budgetMs = 240_000): Promise<{ started: number; processed: number }> {
  const col = await campaigns();
  let started = 0;
  const due = await col.find({ status: 'scheduled', scheduledFor: { $lte: now } } as never).limit(5).toArray();
  for (const c of due as unknown as Campaign[]) {
    const claimed = await col.findOneAndUpdate({ _id: c._id, status: 'scheduled' } as never, { $set: { status: 'sending', startedAt: now } } as never, { returnDocument: 'after' });
    if (!claimed) continue;
    started++;
    const counts = await prepareRecipients(claimed as unknown as Campaign);
    if (counts.total === 0) await col.updateOne({ _id: c._id } as never, { $set: { status: 'done', finishedAt: now } } as never);
  }
  const rec = await recipients();
  const running = await col.find({ status: 'sending' } as never).limit(5).toArray();
  let processed = 0;
  const startedAt = Date.now();
  for (const c of running as unknown as Campaign[]) {
    const remaining = budgetMs - (Date.now() - startedAt);
    if (remaining < 5000) break;
    const queued = await rec.countDocuments({ campaignId: c._id, status: 'queued' } as never);
    if (queued === 0 && (await rec.countDocuments({ campaignId: c._id, status: 'sending' } as never)) === 0) {
      await col.updateOne({ _id: c._id } as never, { $set: { status: 'done', finishedAt: now }, $unset: { lease: '' } } as never);
      continue;
    }
    const r = await processCampaign(String(c._id), remaining);
    if (r.left >= 0) processed++;
  }
  return { started, processed };
}

// ---------------------------------------------------------------------------------------------------------------
// Reading

export interface CampaignSummary {
  id: string;
  filter: AudienceFilter;
  channels: { email: boolean; text: boolean };
  subject: string;
  status: CampaignStatus;
  scheduledFor?: string;
  createdAt: string;
  createdBy: { id: string; name?: string };
  startedAt?: string;
  finishedAt?: string;
  audienceSize?: number;
  counts: Record<Channel, Record<string, number>>;
}

async function countsFor(ids: ObjectId[]): Promise<Map<string, Record<Channel, Record<string, number>>>> {
  const rec = await recipients();
  const rows = await rec.aggregate([{ $match: { campaignId: { $in: ids } } }, { $group: { _id: { c: '$campaignId', ch: '$channel', s: '$status' }, n: { $sum: 1 } } }]).toArray();
  const out = new Map<string, Record<Channel, Record<string, number>>>();
  for (const r of rows as unknown as Array<{ _id: { c: ObjectId; ch: Channel; s: string }; n: number }>) {
    const key = String(r._id.c);
    const entry = out.get(key) ?? { email: {}, text: {} };
    entry[r._id.ch][r._id.s] = r.n;
    out.set(key, entry);
  }
  return out;
}

const summarize = (c: Campaign, counts?: Record<Channel, Record<string, number>>): CampaignSummary => ({
  id: String(c._id),
  filter: c.filter,
  channels: c.channels,
  subject: c.subject,
  status: c.status,
  ...(c.scheduledFor ? { scheduledFor: c.scheduledFor.toISOString() } : {}),
  createdAt: c.createdAt.toISOString(),
  createdBy: c.createdBy,
  ...(c.startedAt ? { startedAt: c.startedAt.toISOString() } : {}),
  ...(c.finishedAt ? { finishedAt: c.finishedAt.toISOString() } : {}),
  ...(c.audienceSize !== undefined ? { audienceSize: c.audienceSize } : {}),
  counts: counts ?? { email: {}, text: {} },
});

export async function listCampaigns(limit = 50): Promise<CampaignSummary[]> {
  const col = await campaigns();
  const rows = (await col.find({} as never).sort({ createdAt: -1 }).limit(limit).toArray()) as unknown as Campaign[];
  const counts = await countsFor(rows.map((r) => r._id));
  return rows.map((r) => summarize(r, counts.get(String(r._id))));
}

export async function getCampaign(id: string): Promise<{ campaign: CampaignSummary & { emailBody: string; emailFormat: EmailFormat; textBody: string }; recipients: Array<Record<string, unknown>> } | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await campaigns();
  const c = (await col.findOne({ _id: new ObjectId(id) } as never)) as unknown as Campaign | null;
  if (!c) return null;
  const counts = await countsFor([c._id]);
  const rec = await recipients();
  const rows = (await rec.find({ campaignId: c._id } as never).sort({ channel: 1, name: 1 }).limit(1000).toArray()) as unknown as RecipientDoc[];
  return {
    campaign: { ...summarize(c, counts.get(String(c._id))), emailBody: c.emailBody, emailFormat: c.emailFormat === 'html' ? 'html' : 'text', textBody: c.textBody },
    recipients: rows.map((r) => ({ name: r.name, channel: r.channel, email: r.email, phone: r.phone, orders: r.orderIds, status: r.status, reason: r.reason, error: r.error, sentAt: r.sentAt, deliveredAt: r.deliveredAt, openCount: r.openCount ?? 0, dry: r.dry })),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// What the providers tell us afterwards

/** A Resend event for an email of a campaign. Returns false when no campaign recipient has this id. */
export async function applyCommunicationEmailEvent(event: EmailEventInput): Promise<boolean> {
  if (!event.emailId) return false;
  const rec = await recipients();
  const filter = { messageId: event.emailId, channel: 'email' };
  const set = (fields: Record<string, unknown>, onlyIf?: RecipientStatus[]) => rec.updateOne(onlyIf ? ({ ...filter, status: { $in: onlyIf } } as never) : (filter as never), { $set: fields } as never);
  const exists = await rec.countDocuments(filter as never, { limit: 1 });
  if (!exists) return false;
  switch (event.type) {
    case 'email.delivered':
      await set({ status: 'delivered', deliveredAt: event.at }, ['sent', 'delayed', 'delivered']);
      break;
    case 'email.delivery_delayed':
      await set({ status: 'delayed' }, ['sent', 'delayed']);
      break;
    case 'email.bounced':
      await set({ status: 'bounced', bouncedAt: event.at, ...(event.bounceReason ? { error: event.bounceReason.slice(0, 200) } : {}) });
      break;
    case 'email.complained':
      await set({ status: 'complained' });
      break;
    case 'email.opened':
      await rec.updateOne(filter as never, { $min: { firstOpenedAt: event.at }, $inc: { openCount: 1 } } as never);
      break;
    default:
      break;
  }
  return true;
}

/** A Twilio delivery receipt for a campaign text. */
export async function applyCommunicationTextReceipt(sid: string, status: string): Promise<void> {
  if (!sid) return;
  const rec = await recipients();
  const mapped: RecipientStatus | null = status === 'delivered' ? 'delivered' : status === 'undelivered' || status === 'failed' ? 'failed' : null;
  if (mapped) await rec.updateOne({ sid, channel: 'text' } as never, { $set: { status: mapped, ...(mapped === 'delivered' ? { deliveredAt: new Date() } : { error: `Text ${status}` }) } } as never);
}

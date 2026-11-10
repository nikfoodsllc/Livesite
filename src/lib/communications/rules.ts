/**
 * Communication tab (admin): the pure rules. Which customers a filter picks, what a message looks like for one customer, and the
 * limits. No database here, so it can be checked on its own.
 */

export type AudienceKind = 'delivery_date' | 'menu_day' | 'ordered_between' | 'people' | 'all' | 'subscribers';

export interface AudienceFilter {
  kind: AudienceKind;
  /** delivery_date and menu_day: the day (YYYY-MM-DD) */
  date?: string;
  /** ordered_between: first and last day (YYYY-MM-DD, Pacific days, both included) */
  from?: string;
  to?: string;
  /** people: the customers picked by hand (account ids) */
  userIds?: string[];
}

export const MAX_ORDERED_RANGE_DAYS = 92;
/** The most customers one message can name by hand */
export const MAX_PEOPLE = 500;
const OBJECT_ID = /^[a-f0-9]{24}$/;
export const SUBJECT_MAX = 150;
export const EMAIL_BODY_MAX = 5000;
/** A custom HTML email: Gmail cuts a message off at about 102 KB, so stay clear of that */
export const EMAIL_HTML_MAX = 90_000;
/** Two text segments: longer messages cost more and read badly */
export const TEXT_BODY_MAX = 320;
/** Texts go out only between these Pacific hours (8:00 up to, not including, 21:00) */
export const TEXT_FIRST_HOUR = 8;
export const TEXT_LAST_HOUR = 21;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isRealDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const f = Date.parse(`${from}T00:00:00Z`);
  const t = Date.parse(`${to}T00:00:00Z`);
  return Math.round((t - f) / 86_400_000);
}

export function parseAudienceFilter(input: unknown): { ok: true; filter: AudienceFilter } | { ok: false; error: string } {
  const f = (input ?? {}) as Record<string, unknown>;
  if (f.kind === 'delivery_date' || f.kind === 'menu_day') {
    if (!isRealDay(f.date)) return { ok: false, error: 'Pick a real date.' };
    return { ok: true, filter: { kind: f.kind, date: f.date } };
  }
  if (f.kind === 'ordered_between') {
    if (!isRealDay(f.from) || !isRealDay(f.to)) return { ok: false, error: 'Pick a real start and end date.' };
    if (f.from > f.to) return { ok: false, error: 'The start date is after the end date.' };
    if (daysBetween(f.from, f.to) + 1 > MAX_ORDERED_RANGE_DAYS) return { ok: false, error: `Pick at most ${MAX_ORDERED_RANGE_DAYS} days.` };
    return { ok: true, filter: { kind: 'ordered_between', from: f.from, to: f.to } };
  }
  if (f.kind === 'all') return { ok: true, filter: { kind: 'all' } };
  if (f.kind === 'subscribers') return { ok: true, filter: { kind: 'subscribers' } };
  if (f.kind === 'people') {
    const ids = Array.isArray(f.userIds) ? [...new Set(f.userIds.filter((v): v is string => typeof v === 'string' && OBJECT_ID.test(v)))] : [];
    if (ids.length === 0) return { ok: false, error: 'Add at least one person.' };
    if (ids.length > MAX_PEOPLE) return { ok: false, error: `Pick at most ${MAX_PEOPLE} people by hand. For more, use Everyone.` };
    return { ok: true, filter: { kind: 'people', userIds: ids } };
  }
  return { ok: false, error: 'Pick how to find the customers.' };
}

/** The UTC instant at which a Pacific day starts (handles daylight saving). */
export function pacificDayStart(day: string): Date {
  for (const offset of ['-07:00', '-08:00']) {
    const candidate = new Date(`${day}T00:00:00${offset}`);
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(candidate);
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    if (`${get('year')}-${get('month')}-${get('day')}` === day && Number(get('hour')) % 24 === 0) return candidate;
  }
  return new Date(`${day}T08:00:00Z`);
}

export function pacificHour(at: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false }).format(at)) % 24;
}

export function pacificDayOf(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** True when a text may go out now (8 AM to 9 PM Pacific). */
export function textsAllowedAt(at: Date): boolean {
  const h = pacificHour(at);
  return h >= TEXT_FIRST_HOUR && h < TEXT_LAST_HOUR;
}

/** Orders that count for a message: not cancelled, and paid (or being handled and not failed or refunded). */
export const COUNTED_ORDER_CLAUSES = [
  { paymentStatus: 'paid' },
  { status: { $in: ['preparing', 'ready', 'out_for_delivery', 'partially_delivered', 'delivered'] }, paymentStatus: { $nin: ['failed', 'refunded'] } },
  { countBeforePayment: true, paymentStatus: { $nin: ['failed', 'refunded'] } },
];

/** The Mongo query for the orders of a filter. */
export function ordersQuery(filter: AudienceFilter): Record<string, unknown> {
  const base: Record<string, unknown> = { status: { $ne: 'cancelled' }, $or: COUNTED_ORDER_CLAUSES };
  if (filter.kind === 'delivery_date' && filter.date) {
    // the day it is really delivered: the moved-to date when there is one, else the menu day
    base.items = { $elemMatch: { $or: [{ actualDeliveryDate: filter.date }, { actualDeliveryDate: { $in: [null, ''] }, deliveryDate: filter.date }] } };
  } else if (filter.kind === 'menu_day' && filter.date) {
    base['items.deliveryDate'] = filter.date;
  } else if (filter.kind === 'ordered_between' && filter.from && filter.to) {
    base.createdAt = { $gte: pacificDayStart(filter.from), $lt: pacificDayStart(addDays(filter.to, 1)) };
  }
  return base;
}

export function formatDayLong(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

// ---------------------------------------------------------------------------------------------------------------
// The message

export const PLACEHOLDERS = ['firstName', 'orderNumber', 'date', 'unsubscribeUrl'] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

export interface MessageContext {
  firstName: string;
  orderNumber: string;
  /** The day of the filter (delivery date or menu day), '' for a period filter */
  date: string;
}

/** Names inside {braces} that are not one of ours (a typo would otherwise go out as it is). */
export function unknownPlaceholders(template: string): string[] {
  const found = [...template.matchAll(/\{([A-Za-z]+)\}/g)].map((m) => m[1]);
  return [...new Set(found.filter((n) => !(PLACEHOLDERS as readonly string[]).includes(n)))];
}

/** {date} only makes sense when the filter has one day. */
export function usesDate(template: string): boolean {
  return /\{date\}/.test(template);
}

export function usesOrderNumber(template: string): boolean {
  return /\{orderNumber\}/.test(template);
}

/** True when the customers come from orders (delivery date, menu day or period), so an order number exists. */
export function filterHasOrders(filter: AudienceFilter): boolean {
  return filter.kind === 'delivery_date' || filter.kind === 'menu_day' || filter.kind === 'ordered_between';
}

export type EmailFormat = 'text' | 'html';

export function parseEmailFormat(value: unknown): EmailFormat {
  return value === 'html' ? 'html' : 'text';
}

const HTML_DANGER = /<\s*(script|iframe|object|embed|form|input|button|textarea|select|link|base)\b/i;

/** What may not be in a custom HTML email: anything an email app would block or that could run code. Null when it is fine. */
export function htmlProblem(html: string): string | null {
  const tag = html.match(HTML_DANGER);
  if (tag) return `Remove the <${tag[1].toLowerCase()}> tag: email apps do not allow it.`;
  if (/\son[a-z]+\s*=/i.test(html)) return 'Remove the onclick-style attributes (onclick, onload, ...): email apps do not allow them.';
  if (/javascript\s*:/i.test(html)) return 'Remove the javascript: link: email apps do not allow it.';
  return null;
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Same as renderMessage, but the values are escaped so a customer's name can never break the HTML. */
export function renderHtmlMessage(template: string, ctx: MessageContext): string {
  return renderMessage(template, { firstName: escapeAttr(ctx.firstName), orderNumber: escapeAttr(ctx.orderNumber), date: ctx.date });
}

/** A pasted snippet becomes a full email page (doctype, phone scaling); a full page is left as it is. */
export function wrapHtmlDocument(html: string, subject: string): string {
  if (/<html[\s>]/i.test(html)) return html;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeAttr(subject)}</title></head>
<body style="margin:0;padding:0;">${html}</body></html>`;
}

/** A readable plain-text version of an HTML email (the part some mail apps and spam filters look at). */
export function htmlToText(html: string): string {
  const decode = (t: string) => t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const withLinks = html
    .replace(/<(head|style|title)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const l = label.replace(/<[^>]+>/g, '').trim();
      return /^(https?:)/i.test(href) && l && l !== href ? `${l} (${href})` : l || href;
    });
  return decode(
    withLinks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l, i, a) => l || (a[i - 1] ?? '') !== '')
    .join('\n')
    .trim();
}

export function renderMessage(template: string, ctx: MessageContext): string {
  return template
    .replace(/\{firstName\}/g, ctx.firstName || 'there')
    .replace(/\{orderNumber\}/g, ctx.orderNumber)
    .replace(/\{date\}/g, ctx.date ? formatDayLong(ctx.date) : '');
}

export function firstNameOf(name: unknown): string {
  const first = String(name ?? '').trim().split(/\s+/)[0] ?? '';
  return first.length > 40 ? '' : first;
}

export interface MessageProblem {
  field: 'subject' | 'emailBody' | 'textBody' | 'channels';
  error: string;
}

export interface MessageInput {
  email: boolean;
  text: boolean;
  subject: unknown;
  emailBody: unknown;
  textBody: unknown;
  emailFormat?: EmailFormat;
}

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** What is wrong with the message, or null when it can go out. Email and text have their own wording. */
export function checkMessage(input: MessageInput, filter: AudienceFilter): MessageProblem | null {
  if (!input.email && !input.text) return { field: 'channels', error: 'Pick Email, Text or both.' };
  const subject = clean(input.subject);
  const emailBody = clean(input.emailBody);
  const textBody = clean(input.textBody);
  const pieces: string[] = [];
  if (input.email) {
    if (!subject) return { field: 'subject', error: 'Write a subject for the email.' };
    if (subject.length > SUBJECT_MAX) return { field: 'subject', error: `The subject is longer than ${SUBJECT_MAX} characters.` };
    if (!emailBody) return { field: 'emailBody', error: 'Write the email.' };
    if (input.emailFormat === 'html') {
      if (emailBody.length > EMAIL_HTML_MAX) return { field: 'emailBody', error: `The HTML is longer than ${EMAIL_HTML_MAX.toLocaleString('en-US')} characters. Gmail cuts longer emails off.` };
      const bad = htmlProblem(emailBody);
      if (bad) return { field: 'emailBody', error: bad };
    } else if (emailBody.length > EMAIL_BODY_MAX) return { field: 'emailBody', error: `The email is longer than ${EMAIL_BODY_MAX} characters.` };
    pieces.push(subject, emailBody);
  }
  if (input.text) {
    if (!textBody) return { field: 'textBody', error: 'Write the text message.' };
    if (textBody.length > TEXT_BODY_MAX) return { field: 'textBody', error: `Texts are limited to ${TEXT_BODY_MAX} characters.` };
    pieces.push(textBody);
  }
  const all = pieces.join(' ');
  const unknown = unknownPlaceholders(all);
  if (unknown.length) return { field: input.email ? 'emailBody' : 'textBody', error: `Unknown placeholder {${unknown[0]}}. Use {firstName}, {orderNumber} or {date}.` };
  const where = input.email ? 'emailBody' : 'textBody';
  if (usesDate(all) && filter.kind !== 'delivery_date' && filter.kind !== 'menu_day') return { field: where, error: '{date} needs the delivery date or menu day choice.' };
  if (usesOrderNumber(all) && !filterHasOrders(filter)) return { field: where, error: '{orderNumber} needs a choice that is based on orders (delivery date, menu day or period).' };
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Email body

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plain text to simple HTML: blank lines separate paragraphs, a single line break stays a break. Everything is escaped. */
export function bodyToHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#1F1712;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

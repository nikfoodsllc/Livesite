/**
 * Moving the delivery date of an order (admin only).
 *
 * An order is a list of day lines. Each line has the menu day it was picked for (`deliveryDate`, which is
 * also the day the kitchen cooks it) and the day it is delivered (`actualDeliveryDate`, different only when the cart
 * combined a small day into a later one). Moving a line changes ONLY the delivery date: the menu / kitchen day and its
 * weekday name stay as they were, so the kitchen dashboard does not move. The route planner, the customer's pages and
 * the emails follow the delivery date. What it was before is kept in the order's `reschedules` history.
 *
 * Pure functions with no database access, so they can be tested on their own. Dates are 'YYYY-MM-DD' strings.
 */

/** Orders that can still be moved: paid and not yet out for delivery. */
export const RESCHEDULABLE_STATUSES = ['confirmed', 'preparing', 'ready'] as const;
/** How far ahead a delivery may be moved. */
export const MAX_DAYS_AHEAD = 120;

const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayLike {
  day?: string;
  deliveryDate?: unknown;
  actualDeliveryDate?: unknown;
  [key: string]: unknown;
}

export interface OrderLike {
  status?: string;
  paymentStatus?: string;
  items?: DayLike[];
}

export interface RescheduleInput {
  /** Position of the day line in the order's items */
  index: number;
  newDate: string;
}

export interface RescheduleChange {
  index: number;
  /** The line's weekday name before and after */
  fromDay: string;
  toDay: string;
  /** Menu day (kitchen day) before */
  fromMenuDate: string;
  /** Delivery date before */
  fromDeliveryDate: string;
  toDate: string;
}

export type RescheduleErrorCode = 'not_allowed' | 'bad_input' | 'nothing_to_change';

export type ReschedulePlan =
  | { ok: true; items: DayLike[]; changes: RescheduleChange[]; oldDates: string[]; newDates: string[] }
  | { ok: false; code: RescheduleErrorCode; error: string };

/** 'YYYY-MM-DD' of a stored date (string or Date), or '' when it is not one. */
export function dateText(value: unknown): string {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '';
  if (typeof value !== 'string') return '';
  const head = value.trim().slice(0, 10);
  return DATE_PATTERN.test(head) ? head : '';
}

/** True for a real calendar date written as 'YYYY-MM-DD' (rejects 2026-02-31). */
export function isRealDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return d.getUTCFullYear() === Number(match[1]) && d.getUTCMonth() === Number(match[2]) - 1 && d.getUTCDate() === Number(match[3]);
}

/** 'Friday' for '2026-10-09'. */
export function weekdayName(date: string): string {
  const match = DATE_PATTERN.exec(date);
  if (!match) return '';
  return WEEKDAYS[new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay()];
}

/** The calendar day `days` after (or before, if negative) a date. */
export function addDays(date: string, days: number): string {
  const match = DATE_PATTERN.exec(date);
  if (!match) return '';
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days)).toISOString().slice(0, 10);
}

/** Why an order cannot be moved, or null when it can. */
export function whyNotReschedulable(order: OrderLike): string | null {
  if (order.paymentStatus !== 'paid') return 'Only paid orders can be moved to another delivery date.';
  if (!order.status || !(RESCHEDULABLE_STATUSES as readonly string[]).includes(order.status)) {
    return order.status === 'cancelled'
      ? 'This order is cancelled.'
      : order.status === 'delivered' || order.status === 'out_for_delivery'
        ? 'This order is already out for delivery or delivered.'
        : 'This order cannot be moved in its current status.';
  }
  if (!Array.isArray(order.items) || order.items.length === 0) return 'This order has no delivery days.';
  return null;
}

/** The dates (delivery date of each day line) of an order, each once, oldest first. */
export function deliveryDatesOf(items: DayLike[] | undefined): string[] {
  const set = new Set<string>();
  for (const line of items ?? []) {
    const date = dateText(line.actualDeliveryDate) || dateText(line.deliveryDate);
    if (date) set.add(date);
  }
  return [...set].sort();
}

/**
 * Works out what moving some day lines does: the new items, a record of each change and which delivery dates
 * left or joined the order. `today` is today's date in Pacific time.
 */
export function planReschedule(order: OrderLike, inputs: RescheduleInput[], today: string): ReschedulePlan {
  const blocked = whyNotReschedulable(order);
  if (blocked) return { ok: false, code: 'not_allowed', error: blocked };

  if (!Array.isArray(inputs) || inputs.length === 0) return { ok: false, code: 'bad_input', error: 'Choose at least one day to move.' };
  if (!isRealDate(today)) return { ok: false, code: 'bad_input', error: 'Could not work out today’s date.' };

  const items = order.items as DayLike[];
  const seen = new Set<number>();
  const latest = addDays(today, MAX_DAYS_AHEAD);
  const changes: RescheduleChange[] = [];
  const next = items.map((line) => ({ ...line }));

  for (const input of inputs) {
    const index = input?.index;
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return { ok: false, code: 'bad_input', error: 'That day is not part of this order.' };
    if (seen.has(index)) return { ok: false, code: 'bad_input', error: 'The same day was chosen twice.' };
    seen.add(index);

    const newDate = typeof input.newDate === 'string' ? input.newDate.trim() : '';
    if (!isRealDate(newDate)) return { ok: false, code: 'bad_input', error: 'Choose a valid date.' };
    if (newDate < today) return { ok: false, code: 'bad_input', error: 'The new date cannot be in the past.' };
    if (newDate > latest) return { ok: false, code: 'bad_input', error: `The new date cannot be more than ${MAX_DAYS_AHEAD} days away.` };

    const line = items[index];
    const menuDate = dateText(line.deliveryDate);
    const deliveryDate = dateText(line.actualDeliveryDate) || menuDate;
    if (!menuDate) return { ok: false, code: 'bad_input', error: 'That day has no date to move.' };
    // nothing to do when the line is already delivered on that date
    if (deliveryDate === newDate) continue;

    // the kitchen day (deliveryDate) and the weekday name stay; only the delivery date changes
    const day = typeof line.day === 'string' ? line.day : weekdayName(menuDate);
    changes.push({
      index,
      fromDay: day,
      toDay: day,
      fromMenuDate: menuDate,
      fromDeliveryDate: deliveryDate,
      toDate: newDate,
    });
    next[index] = { ...line, actualDeliveryDate: newDate };
  }

  if (changes.length === 0) return { ok: false, code: 'nothing_to_change', error: 'The delivery date is already that date.' };

  const oldDates = deliveryDatesOf(items);
  const newDates = deliveryDatesOf(next);
  return { ok: true, items: next, changes, oldDates, newDates };
}

/** Delivery dates that were on the order and are not any more (their route stops must go). */
export function staleDates(oldDates: string[], newDates: string[]): string[] {
  const keep = new Set(newDates);
  return oldDates.filter((d) => !keep.has(d));
}

/** What the history of an order (oldest first) says about its dates: one line per day line, original to current. */
export function originalDates(history: Array<{ changes: RescheduleChange[] }> | undefined): Map<number, { menuDate: string; deliveryDate: string }> {
  const first = new Map<number, { menuDate: string; deliveryDate: string }>();
  for (const record of history ?? []) {
    for (const change of record.changes ?? []) {
      if (!first.has(change.index)) first.set(change.index, { menuDate: change.fromMenuDate, deliveryDate: change.fromDeliveryDate });
    }
  }
  return first;
}

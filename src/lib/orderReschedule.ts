/**
 * Moving the delivery date of items in an order (admin only).
 *
 * An order is a list of day lines. Each line has the menu day it was picked for (`deliveryDate`, also the day the
 * kitchen cooks it), the weekday name, the day it is delivered (`actualDeliveryDate`, different only when the cart
 * combined a small day into a later one) and its items. An admin picks items and gives them a new DELIVERY date:
 * the kitchen day and the weekday never change. Items that leave a line go into another line with the same kitchen day
 * and the new delivery date (an existing one if there is one, otherwise a new line right after the source line); a line
 * left with no items disappears. Every item that was moved remembers the delivery date it started with
 * (`originalDeliveryDate`, business only) so the screens and the email can say what moved. The day totals are
 * recalculated from the items (a day total is always the sum of price x quantity, and the day totals add up to the
 * order's subtotal), so no money changes.
 *
 * Pure functions with no database access, so they can be tested on their own. Dates are 'YYYY-MM-DD' strings.
 */

/** Orders that can still be moved: paid and not yet out for delivery. */
export const RESCHEDULABLE_STATUSES = ['confirmed', 'preparing', 'ready'] as const;
/** How far ahead a delivery may be moved. */
export const MAX_DAYS_AHEAD = 120;
/** Most items one request may move. */
export const MAX_ITEMS_PER_MOVE = 200;

const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ItemLike {
  price?: unknown;
  quantity?: unknown;
  originalDeliveryDate?: unknown;
  food?: { _id?: unknown; name?: unknown } | null;
  [key: string]: unknown;
}

interface DayLike {
  day?: string;
  deliveryDate?: unknown;
  actualDeliveryDate?: unknown;
  items?: ItemLike[];
  dayTotal?: unknown;
  [key: string]: unknown;
}

export interface OrderLike {
  status?: string;
  paymentStatus?: string;
  items?: DayLike[];
}

/** One item picked by its position: the day line, and the item inside that line. */
export interface ItemSelection {
  line: number;
  item: number;
}

/** What the history records for each moved item. */
export interface RescheduleChange {
  line: number;
  item: number;
  name: string;
  foodId?: string;
  quantity: number;
  /** Kitchen day of the item (it does not change) */
  menuDate: string;
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

/** The delivery date of a day line. */
export function lineDeliveryDate(line: DayLike): string {
  return dateText(line.actualDeliveryDate) || dateText(line.deliveryDate);
}

/** The dates (delivery date of each day line) of an order, each once, oldest first. */
export function deliveryDatesOf(items: DayLike[] | undefined): string[] {
  const set = new Set<string>();
  for (const line of items ?? []) {
    const date = lineDeliveryDate(line);
    if (date) set.add(date);
  }
  return [...set].sort();
}

const money = (n: number) => Math.round(n * 100) / 100;

/** A day total is the sum of price x quantity of its items. */
export function dayTotalOf(items: ItemLike[]): number {
  return money(items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0));
}

/**
 * Works out what moving some items to a new delivery date does: the new lines, a record of each moved item and which
 * delivery dates left or joined the order. `today` is today's date in Pacific time.
 */
export function planItemReschedule(order: OrderLike, selections: ItemSelection[], newDate: string, today: string): ReschedulePlan {
  const blocked = whyNotReschedulable(order);
  if (blocked) return { ok: false, code: 'not_allowed', error: blocked };

  if (!Array.isArray(selections) || selections.length === 0) return { ok: false, code: 'bad_input', error: 'Choose at least one item to move.' };
  if (selections.length > MAX_ITEMS_PER_MOVE) return { ok: false, code: 'bad_input', error: 'Too many items in one move.' };
  if (!isRealDate(today)) return { ok: false, code: 'bad_input', error: 'Could not work out today’s date.' };
  const target = typeof newDate === 'string' ? newDate.trim() : '';
  if (!isRealDate(target)) return { ok: false, code: 'bad_input', error: 'Choose a valid date.' };
  if (target < today) return { ok: false, code: 'bad_input', error: 'The new date cannot be in the past.' };
  if (target > addDays(today, MAX_DAYS_AHEAD)) return { ok: false, code: 'bad_input', error: `The new date cannot be more than ${MAX_DAYS_AHEAD} days away.` };

  const lines = order.items as DayLike[];
  const picked = new Set<string>();
  for (const s of selections) {
    const line = s?.line;
    const item = s?.item;
    if (!Number.isInteger(line) || !Number.isInteger(item) || line < 0 || line >= lines.length) return { ok: false, code: 'bad_input', error: 'That item is not part of this order.' };
    const list = lines[line].items;
    if (!Array.isArray(list) || item < 0 || item >= list.length) return { ok: false, code: 'bad_input', error: 'That item is not part of this order.' };
    const key = `${line}:${item}`;
    if (picked.has(key)) return { ok: false, code: 'bad_input', error: 'The same item was chosen twice.' };
    picked.add(key);
  }

  const changes: RescheduleChange[] = [];
  // the lines after the move, each remembering which source line it came from so moved items can follow it
  const out: Array<{ line: DayLike; source: number }> = [];
  const groups: Array<{ source: number; line: DayLike; items: ItemLike[] }> = [];

  lines.forEach((line, lineIndex) => {
    const from = lineDeliveryDate(line);
    const menuDate = dateText(line.deliveryDate);
    const keep: ItemLike[] = [];
    const move: ItemLike[] = [];
    (line.items ?? []).forEach((item, itemIndex) => {
      // an item already delivered on that date stays where it is
      if (picked.has(`${lineIndex}:${itemIndex}`) && from !== target) {
        move.push({ ...item, originalDeliveryDate: dateText(item.originalDeliveryDate) || from });
        const foodId = item.food?._id;
        changes.push({
          line: lineIndex,
          item: itemIndex,
          name: typeof item.food?.name === 'string' ? item.food.name : 'Item',
          foodId: foodId === undefined || foodId === null ? undefined : String(foodId),
          quantity: Number(item.quantity) || 0,
          menuDate,
          fromDeliveryDate: from,
          toDate: target,
        });
      } else keep.push(item);
    });
    if (move.length === 0) {
      out.push({ line: { ...line, items: keep }, source: lineIndex });
      return;
    }
    if (keep.length > 0) out.push({ line: { ...line, items: keep, dayTotal: dayTotalOf(keep) }, source: lineIndex });
    groups.push({ source: lineIndex, line, items: move });
  });

  if (changes.length === 0) return { ok: false, code: 'nothing_to_change', error: 'Those items are already delivered on that date.' };

  for (const group of groups) {
    const menuDate = dateText(group.line.deliveryDate);
    // join a line that already has this kitchen day and weekday and is delivered on the new date
    const existing = out.find((o) => dateText(o.line.deliveryDate) === menuDate && o.line.day === group.line.day && lineDeliveryDate(o.line) === target);
    if (existing) {
      const items = [...(existing.line.items ?? []), ...group.items];
      existing.line = { ...existing.line, items, dayTotal: dayTotalOf(items) };
      continue;
    }
    const created: DayLike = { ...group.line, actualDeliveryDate: target, items: group.items, dayTotal: dayTotalOf(group.items) };
    // right after the part of its source line that stayed (or where the source line was)
    let at = -1;
    out.forEach((o, i) => {
      if (o.source === group.source) at = i;
    });
    if (at === -1) {
      const next = out.findIndex((o) => o.source > group.source);
      at = next === -1 ? out.length - 1 : next - 1;
    }
    out.splice(at + 1, 0, { line: created, source: group.source });
  }

  const next = out.map((o) => o.line);
  return { ok: true, items: next, changes, oldDates: deliveryDatesOf(lines), newDates: deliveryDatesOf(next) };
}

/** Delivery dates that were on the order and are not any more (their route stops must go). */
export function staleDates(oldDates: string[], newDates: string[]): string[] {
  const keep = new Set(newDates);
  return oldDates.filter((d) => !keep.has(d));
}

export interface MovedItem {
  name: string;
  quantity: number;
  fromDate: string;
  toDate: string;
}

/** Every item that is not on the delivery date it started with: where it started and where it is now. */
export function movedItemsOf(order: { items?: DayLike[] }): MovedItem[] {
  const moved: MovedItem[] = [];
  for (const line of order.items ?? []) {
    const to = lineDeliveryDate(line);
    for (const item of line.items ?? []) {
      const from = dateText(item.originalDeliveryDate);
      if (from && to && from !== to) moved.push({ name: typeof item.food?.name === 'string' ? item.food.name : 'Item', quantity: Number(item.quantity) || 0, fromDate: from, toDate: to });
    }
  }
  return moved;
}

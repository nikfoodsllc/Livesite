import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { creditForFeeCents, creditForItemCents, toCents, toDollars } from '@/lib/storeCredit';
import { addCredit } from '@/lib/server/storeCredit';
import { isQuoteOrder } from '@/lib/quoteOrder';

export const MAX_CREDIT_ITEMS_PER_REQUEST = 40;

export interface CreditSelection {
  line: number;
  item: number;
  /** How many of that item to credit (default: all that are still left) */
  quantity?: number;
  /** Admin override of what this item is credited, in dollars (at most the item's price with its tax) */
  amount?: number;
}

export interface CreditIssued {
  at: Date | string;
  by: string;
  note?: string;
  /** Whether the 10.3% tax on the items was credited too */
  includeTax?: boolean;
  /** Platform Fee and its tax credited with this one, in dollars (at most once per order) */
  fee?: number;
  /** The tip credited (only when the whole order was credited), in dollars */
  tip?: number;
  /** True when the whole order was credited in one go */
  entireOrder?: boolean;
  amount: number;
  items: Array<{ line: number; item: number; name: string; quantity: number; amount: number }>;
}

export type IssueResult =
  | { ok: true; issued: CreditIssued; balance: number; orderId: string }
  | { ok: false; status: number; error: string };

const fail = (status: number, error: string): IssueResult => ({ ok: false, status, error });

/** How many of each item (by line + item position) were already credited on this order. */
export function creditedQuantities(order: Pick<Order, 'creditsIssued'>): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of order.creditsIssued ?? []) {
    for (const it of entry.items ?? []) {
      const key = `${it.line}:${it.item}`;
      map.set(key, (map.get(key) ?? 0) + it.quantity);
    }
  }
  return map;
}

/**
 * Admin gives a customer store credit for specific items of a paid order: the item's price (eco container and portion
 * included) x quantity, plus the 10.3% tax on it only when the admin chooses to (withheld by default). The Platform Fee, the tax on it and the tip are never credited.
 * Each item can only be credited up to the quantity ordered, across all requests.
 */
export async function issueItemCredit(orderId: string, selections: CreditSelection[], note: string | undefined, adminId: string, includeTax = false, includeFee = false, entireOrder = false): Promise<IssueResult> {
  if (!entireOrder) {
    if (!Array.isArray(selections) || selections.length === 0) return fail(400, 'Pick at least one item.');
    if (selections.length > MAX_CREDIT_ITEMS_PER_REQUEST) return fail(400, 'Too many items in one go.');
  }

  const found = await db.readOne<Order>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order) return fail(404, 'No order with that number');
  if (!order.user) return fail(409, 'This order has no customer account to give credit to.');
  if (order.paymentStatus !== 'paid') return fail(409, 'Credit can only be given for a paid order.');
  if (order.status === 'cancelled') return fail(409, 'This order is cancelled.');
  if (isQuoteOrder(order)) return fail(409, 'A quote was never charged, so there is nothing to credit.');

  const already = creditedQuantities(order);
  if (entireOrder) {
    // everything still left on the order: every item with its tax, the Platform Fee with its tax, and the tip
    includeTax = true;
    selections = [];
    (order.items ?? []).forEach((day, line) => (day.items ?? []).forEach((it, item) => { if ((it.quantity ?? 0) - (already.get(`${line}:${item}`) ?? 0) > 0) selections.push({ line, item }); }));
  }
  const picked = new Map<string, { line: number; item: number; name: string; quantity: number; cents: number }>();
  for (const sel of selections) {
    const line = Number(sel?.line);
    const item = Number(sel?.item);
    const dayItem = Number.isInteger(line) && Number.isInteger(item) ? order.items?.[line]?.items?.[item] : undefined;
    if (!dayItem) return fail(400, 'One of the items is not on this order.');
    const key = `${line}:${item}`;
    if (picked.has(key)) return fail(400, 'An item was picked twice.');
    const left = Math.max(0, (dayItem.quantity ?? 0) - (already.get(key) ?? 0));
    if (left === 0) return fail(409, `${dayItem.food?.name ?? 'This item'} has already been credited in full.`);
    const wanted = sel.quantity === undefined ? left : Math.floor(Number(sel.quantity));
    if (!(wanted >= 1) || wanted > left) return fail(400, `${dayItem.food?.name ?? 'This item'}: only ${left} left to credit.`);
    let cents = creditForItemCents(dayItem.price, wanted, includeTax);
    if (!entireOrder && sel.amount !== undefined && sel.amount !== null) {
      const override = toCents(Number(sel.amount));
      const most = creditForItemCents(dayItem.price, wanted, true);
      if (!Number.isFinite(override) || override <= 0) return fail(400, `${dayItem.food?.name ?? 'This item'}: enter an amount above zero.`);
      if (override > most) return fail(400, `${dayItem.food?.name ?? 'This item'}: the most that can be credited is $${toDollars(most).toFixed(2)}.`);
      cents = override;
    }
    picked.set(key, { line, item, name: dayItem.food?.name ?? 'Item', quantity: wanted, cents });
  }

  const items = [...picked.values()];
  let feeCents = 0;
  const feeDone = (order.creditsIssued ?? []).some((c) => (c.fee ?? 0) > 0);
  if (includeFee || entireOrder) {
    if (feeDone && !entireOrder) return fail(409, 'The Platform Fee was already credited on this order.');
    feeCents = order.platformFeeWaived || feeDone ? 0 : creditForFeeCents(order.platformFee);
    if (!(feeCents > 0) && !entireOrder) return fail(409, 'This order has no Platform Fee to credit.');
  }
  const tipDone = (order.creditsIssued ?? []).some((c) => (c.tip ?? 0) > 0);
  const tipCents = entireOrder && !tipDone ? toCents(order.tip ?? 0) : 0;
  if (entireOrder && (order.creditsIssued ?? []).length === 0 && items.length > 0) {
    // nothing was credited before: the credit is exactly what the customer paid, so the last item absorbs the rounding of the taxes
    const itemsTarget = toCents(order.totalPaid) - feeCents - tipCents;
    const diff = itemsTarget - items.reduce((n, i) => n + i.cents, 0);
    if (itemsTarget > 0 && Math.abs(diff) <= 100) items[items.length - 1].cents += diff;
  }
  const totalCents = items.reduce((n, i) => n + i.cents, 0) + feeCents + tipCents;
  if (!(totalCents > 0)) return fail(400, 'Nothing to credit.');

  const cleanNote = typeof note === 'string' ? note.trim().slice(0, 200) : '';
  const issued: CreditIssued = {
    at: new Date(),
    by: adminId,
    ...(cleanNote ? { note: cleanNote } : {}),
    includeTax,
    ...(feeCents > 0 ? { fee: toDollars(feeCents) } : {}),
    ...(tipCents > 0 ? { tip: toDollars(tipCents) } : {}),
    ...(entireOrder ? { entireOrder: true } : {}),
    amount: toDollars(totalCents),
    items: items.map((i) => ({ line: i.line, item: i.item, name: i.name, quantity: i.quantity, amount: toDollars(i.cents) })),
  };

  // Record it on the order FIRST, and only if nobody credited this order in the meantime (so two admins pressing at once
  // cannot credit the same item twice); the balance is added right after.
  const seen = (order.creditsIssued ?? []).length;
  const guard = seen === 0 ? { $or: [{ creditsIssued: { $exists: false } }, { creditsIssued: { $size: 0 } }] } : { creditsIssued: { $size: seen } };
  const recorded = await db.updateOne(
    'orders',
    { orderId, ...guard } as never,
    { $push: { creditsIssued: issued }, $set: { updatedAt: new Date() } } as never
  );
  if (!recorded.success) return fail(500, 'Could not save the credit. Nothing was given.');
  if (!recorded.modifiedCount) return fail(409, 'This order was just changed by someone else. Reload and try again.');

  let balanceCents: number;
  try {
    balanceCents = await addCredit({
      userId: String(order.user),
      cents: totalCents,
      type: 'issued',
      orderId,
      reason: cleanNote || undefined,
      by: adminId,
      items: [
        ...items.map((i) => ({ line: i.line, item: i.item, name: i.name, quantity: i.quantity, cents: i.cents })),
        ...(feeCents > 0 ? [{ line: -1, item: -1, name: 'Platform Fee (with tax)', quantity: 1, cents: feeCents }] : []),
        ...(tipCents > 0 ? [{ line: -1, item: -1, name: 'Tip', quantity: 1, cents: tipCents }] : []),
      ],
    });
  } catch (error) {
    // the order says credit was given but the balance did not change: take the record back so it can be tried again
    await db.updateOne('orders', { orderId } as never, { $pull: { creditsIssued: { at: issued.at } } } as never);
    console.error('[store-credit] could not add the credit', { orderId, message: error instanceof Error ? error.message : String(error) });
    return fail(500, 'Could not add the credit. Nothing was given. Try again.');
  }

  return { ok: true, issued, balance: toDollars(balanceCents), orderId };
}

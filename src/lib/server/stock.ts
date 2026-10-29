import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { STOCK_HOLD_MINUTES, amountIn, baseOf, cleanStockUnit, cleanThreshold, formatAmount, lineAmounts, stockSince, stockState, type LineAmount, type StockLineInput, type StockUnit } from '@/lib/stockRules';

/** Which orders use up stock: the ones the kitchen counts (paid, in progress, entered by an admin to count at once), plus orders waiting for payment for a short while. A cancelled order, and a failed or refunded payment, give the pieces back. */
function usedStockClauses(now: Date) {
  return [
    { paymentStatus: 'paid' },
    { status: { $in: ['preparing', 'ready', 'out_for_delivery', 'partially_delivered', 'delivered'] }, paymentStatus: { $nin: ['failed', 'refunded'] } },
    { countBeforePayment: true, paymentStatus: { $nin: ['failed', 'refunded'] } },
    { paymentStatus: 'pending', createdAt: { $gte: new Date(now.getTime() - STOCK_HOLD_MINUTES * 60_000) } },
  ];
}

export interface StockedItem {
  id: string;
  /** amounts ordered before this moment do not count (the limit was set, reset by hand, or reset at the daily time) */
  since: Date;
  unit: StockUnit;
}

/** Amounts ordered of each item since its own start moment, in its limit's base (units, or ounces), also inside combos. Items nobody ordered are 0. */
export async function orderedAmounts(items: StockedItem[], now: Date = new Date()): Promise<Map<string, number>> {
  const totals = new Map<string, number>(items.map((i) => [i.id, 0]));
  if (items.length === 0) return totals;
  const ids = items.map((i) => i.id);
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const earliest = new Date(Math.min(...items.map((i) => i.since.getTime())));
  const by = new Map(items.map((i) => [i.id, i]));
  const orders = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  const rows = await orders.aggregate([
    { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: earliest }, $or: usedStockClauses(now) } },
    { $unwind: '$items' },
    { $unwind: '$items.items' },
    // the item itself, or a combo (whose picked options are items too)
    { $match: { $or: [{ 'items.items.food._id': { $in: [...ids, ...objectIds] } }, { 'items.items.food.sections.0': { $exists: true } }] } },
    { $project: { _id: 0, food: { _id: '$items.items.food._id', sections: '$items.items.food.sections' }, selectedPortion: '$items.items.selectedPortion', quantity: '$items.items.quantity', comboSelections: '$items.items.comboSelections', createdAt: 1 } },
  ]).toArray();
  for (const row of rows as unknown as Array<StockLineInput & { selectedPortion?: unknown; createdAt: unknown }>) {
    const at = row.createdAt instanceof Date ? row.createdAt.getTime() : new Date(String(row.createdAt)).getTime();
    for (const [foodId, amount] of lineAmounts(row)) {
      const item = by.get(foodId);
      if (!item || !(at >= item.since.getTime())) continue;
      totals.set(foodId, (totals.get(foodId) ?? 0) + amountIn(amount, item.unit));
    }
  }
  return totals;
}

interface FoodDoc {
  _id: unknown;
  name?: unknown;
  stockThreshold?: unknown;
  stockUnit?: unknown;
  stockResetAt?: unknown;
  stockResetMode?: unknown;
  stockResetTime?: unknown;
  createdAt?: unknown;
}

const unitOf = (d: FoodDoc): StockUnit => cleanStockUnit(d.stockUnit);
const limitOf = (d: FoodDoc): number | null => cleanThreshold(d.stockThreshold, unitOf(d));
const toItem = (d: FoodDoc, now: Date): StockedItem => ({ id: String(d._id), since: stockSince(d, now), unit: unitOf(d) });

export interface Remaining {
  /** what is left in the base (units, or ounces) */
  base: number;
  /** 'units' or 'oz' */
  baseUnit: 'units' | 'oz';
}

/** For the menu: what is left of each item that has an order limit (0 = sold out), by food item id. Never throws; if the count fails nothing is limited. */
export async function stockRemainingByFood(docs: FoodDoc[], now: Date = new Date()): Promise<Map<string, Remaining>> {
  const left = new Map<string, Remaining>();
  const limited = docs.filter((d) => limitOf(d) !== null);
  if (limited.length === 0) return left;
  try {
    const counts = await orderedAmounts(limited.map((d) => toItem(d, now)), now);
    for (const d of limited) {
      const state = stockState(d.stockThreshold, counts.get(String(d._id)) ?? 0, unitOf(d));
      if (state.remainingBase !== null) left.set(String(d._id), { base: state.remainingBase, baseUnit: baseOf(unitOf(d)) });
    }
  } catch (error) {
    console.error('[stock] could not count', error instanceof Error ? error.message : error);
  }
  return left;
}

/** For the menu: which of these food items have reached their limit. */
export async function soldOutFoodIds(docs: FoodDoc[], now: Date = new Date()): Promise<Set<string>> {
  const left = await stockRemainingByFood(docs, now);
  return new Set([...left.entries()].filter(([, r]) => r.base <= 0).map(([id]) => id));
}

export interface OutOfStockLine {
  foodItemId: string;
  name: string;
  /** in words: "3", "1.5 lb" */
  wantedText: string;
  remainingText: string;
  remainingBase: number;
}

/**
 * The items of an order that ask for more than is left of an item with a limit. Amounts of the same item on several days, lines or
 * inside combos add up. Fails open: if the stock cannot be read, the order is allowed (a counting problem must not stop sales).
 */
export async function findOutOfStockLines(lines: Array<StockLineInput & { selectedPortion?: unknown }>, now: Date = new Date()): Promise<OutOfStockLine[]> {
  const wanted = new Map<string, LineAmount>();
  for (const line of lines) {
    for (const [id, a] of lineAmounts(line)) {
      const cur = wanted.get(id) ?? { units: 0, ounces: 0 };
      cur.units += a.units;
      cur.ounces += a.ounces;
      wanted.set(id, cur);
    }
  }
  const ids = [...wanted.keys()].filter((id) => ObjectId.isValid(id));
  if (ids.length === 0) return [];
  try {
    const found = await db.read('fooditems', { _id: { $in: ids.map((id) => new ObjectId(id)) }, stockThreshold: { $gt: 0 } });
    const docs = (found.success && found.data ? found.data : []) as FoodDoc[];
    if (docs.length === 0) return [];
    const counts = await orderedAmounts(docs.map((d) => toItem(d, now)), now);
    const out: OutOfStockLine[] = [];
    for (const d of docs) {
      const id = String(d._id);
      const unit = unitOf(d);
      const state = stockState(d.stockThreshold, counts.get(id) ?? 0, unit);
      const want = amountIn(wanted.get(id), unit);
      if (state.remainingBase !== null && want > state.remainingBase + 1e-9) {
        out.push({ foodItemId: id, name: String(d.name ?? 'This item'), wantedText: formatAmount(want, unit), remainingText: formatAmount(state.remainingBase, unit), remainingBase: state.remainingBase });
      }
    }
    return out;
  } catch (error) {
    console.error('[stock] could not check', error instanceof Error ? error.message : error);
    return [];
  }
}

/** The message shown to the customer: which items are gone or short. */
export function outOfStockMessage(lines: OutOfStockLine[]): string {
  const parts = lines.map((l) => (l.remainingBase <= 0 ? `${l.name} is sold out` : `Only ${l.remainingText} of ${l.name} left`));
  return `${parts.join('. ')}. Please update your cart.`;
}

/**
 * Marks the options of a combo whose item has reached its limit (`item.soldOut` and `item.available = false`), so the combo dialog can
 * say Out of stock and not offer them. Never throws.
 */
export async function markSoldOutOptions(sections: Array<Record<string, unknown>>, now: Date = new Date()): Promise<void> {
  try {
    const items: Array<Record<string, unknown>> = [];
    for (const section of sections) for (const option of ((section.selectedItems as Array<{ item?: Record<string, unknown> }> | undefined) ?? [])) if (option.item?._id) items.push(option.item);
    const ids = [...new Set(items.map((i) => String(i._id)))].filter((id) => ObjectId.isValid(id));
    if (ids.length === 0) return;
    const found = await db.read('fooditems', { _id: { $in: ids.map((id) => new ObjectId(id)) }, stockThreshold: { $gt: 0 } });
    const docs = (found.success && found.data ? found.data : []) as FoodDoc[];
    if (docs.length === 0) return;
    const gone = await soldOutFoodIds(docs, now);
    for (const item of items) {
      if (gone.has(String(item._id))) {
        item.soldOut = true;
        item.available = false;
      }
    }
  } catch (error) {
    console.error('[stock] could not mark the combo options', error instanceof Error ? error.message : error);
  }
}

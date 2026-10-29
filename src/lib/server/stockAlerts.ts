import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { orderedAmounts } from '@/lib/server/stock';
import { adminFoodItemsUrl, sendStockAlertEmail } from '@/lib/stockAlertEmail';
import type { StockAlertInfo } from '@/templates/stockAlert';
import { cleanAlertPercent, cleanResetMode, cleanResetTime, cleanStockUnit, cleanThreshold, formatAmount, limitInBase, lineAmounts, stockLevel, stockSince, stockState, type StockLineInput, type StockUnit } from '@/lib/stockRules';

/**
 * Low-stock and sold-out emails for the team. After an order starts to count (paid, entered by an admin, ...) the items in it that
 * have an order limit are looked at again: when what is left is at or under the item's alert share of the limit ("low"), or the limit
 * is reached ("out"), the team gets ONE email for that item. One email per item per count: the count starts again when the limit is
 * set, changed or reset, and then the alerts can come again. A sold-out item that skipped "low" (one big order) only gets "sold out".
 */

interface FoodDoc {
  _id: unknown;
  name?: unknown;
  url?: unknown;
  stockThreshold?: unknown;
  stockUnit?: unknown;
  stockAlertPercent?: unknown;
  stockResetAt?: unknown;
  stockResetMode?: unknown;
  stockResetTime?: unknown;
  createdAt?: unknown;
}

let indexReady = false;
async function alertsCollection() {
  const coll = await db.getCollectionForOperations<Record<string, unknown>>('stockAlerts');
  if (!indexReady) {
    try {
      await coll.createIndex({ foodItemId: 1, kind: 1, period: 1 }, { unique: true });
      indexReady = true;
    } catch (error) {
      console.error('[stock-alert] could not create the index', error instanceof Error ? error.message : error);
    }
  }
  return coll;
}

const clock = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** "Resets every day at 3:00 AM (Pacific)" or "Nobody resets it by itself: press Reset count when you restock". */
export function resetSentence(doc: Pick<FoodDoc, 'stockResetMode' | 'stockResetTime'>): string {
  const time = cleanResetTime(doc.stockResetTime);
  return cleanResetMode(doc.stockResetMode) === 'daily' && time ? `The count resets every day at ${clock(time)} (Pacific)` : 'Nobody resets the count by itself: press Reset count when you restock';
}

/** The facts of an item for the email, from its saved settings and what has been ordered (in the base of its limit). */
export function alertInfoFor(doc: FoodDoc, orderedBase: number, kind: 'low' | 'out'): StockAlertInfo | null {
  const unit: StockUnit = cleanStockUnit(doc.stockUnit);
  const limit = cleanThreshold(doc.stockThreshold, unit);
  if (limit === null) return null;
  const state = stockState(limit, orderedBase, unit);
  const cap = limitInBase(limit, unit);
  const shown = (base: number) => formatAmount(base, unit);
  return {
    kind,
    itemName: String(doc.name ?? 'An item'),
    imageUrl: typeof doc.url === 'string' && /^https?:\/\//.test(doc.url) ? doc.url : undefined,
    limitText: shown(cap),
    orderedText: shown(state.orderedBase),
    leftText: shown(state.remainingBase ?? 0),
    usedPercent: cap > 0 ? (state.orderedBase / cap) * 100 : 100,
    alertPercent: cleanAlertPercent(doc.stockAlertPercent),
    resetText: resetSentence(doc),
    adminUrl: adminFoodItemsUrl(),
  };
}

/** Claims the alert for this count: true for the first caller, false when it was already claimed (so it is never sent twice). */
async function claim(foodItemId: string, kind: 'low' | 'out', period: string, now: Date): Promise<boolean> {
  const coll = await alertsCollection();
  try {
    await coll.insertOne({ foodItemId, kind, period, at: now });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return false;
    throw error;
  }
}

async function release(foodItemId: string, kind: 'low' | 'out', period: string): Promise<void> {
  const coll = await alertsCollection();
  await coll.deleteOne({ foodItemId, kind, period });
}

/** Looks at these items and sends the team emails that are due. Returns what it sent (for tests). */
export async function checkStockAlerts(
  foodIds: string[],
  now: Date = new Date(),
  send: (info: StockAlertInfo) => Promise<{ success: boolean; error?: string }> = (info) => sendStockAlertEmail(info)
): Promise<Array<{ foodItemId: string; kind: 'low' | 'out'; sent: boolean }>> {
  const ids = [...new Set(foodIds)].filter((id) => ObjectId.isValid(id));
  if (ids.length === 0) return [];
  const found = await db.read('fooditems', { _id: { $in: ids.map((id) => new ObjectId(id)) }, stockThreshold: { $gt: 0 } });
  const docs = (found.success && found.data ? found.data : []) as FoodDoc[];
  if (docs.length === 0) return [];
  const counts = await orderedAmounts(docs.map((d) => ({ id: String(d._id), since: stockSince(d, now), unit: cleanStockUnit(d.stockUnit) })), now);
  const done: Array<{ foodItemId: string; kind: 'low' | 'out'; sent: boolean }> = [];
  for (const doc of docs) {
    const id = String(doc._id);
    const unit = cleanStockUnit(doc.stockUnit);
    const state = stockState(doc.stockThreshold, counts.get(id) ?? 0, unit);
    const level = stockLevel(state, doc.stockAlertPercent);
    if (level !== 'low' && level !== 'out') continue;
    const period = `${stockSince(doc, now).toISOString()}|${state.limit}${unit}`;
    // an item that went straight to sold out does not also get a "low" email afterwards
    if (level === 'out') await claim(id, 'low', period, now).catch(() => false);
    if (!(await claim(id, level, period, now))) continue;
    const info = alertInfoFor(doc, counts.get(id) ?? 0, level);
    if (!info) continue;
    const result = await send(info);
    if (!result.success) {
      // not sent: give the claim back so the next order tries again
      await release(id, level, period).catch(() => undefined);
      console.error('[stock-alert] email not sent', { foodItemId: id, kind: level, error: result.error });
    }
    done.push({ foodItemId: id, kind: level, sent: result.success });
  }
  return done;
}

/** The items of an order that can have a limit (also the picked parts of combos). */
export function foodIdsOfOrder(order: { items?: Array<{ items?: Array<Record<string, unknown>> }> }): string[] {
  const out = new Set<string>();
  for (const day of order.items ?? []) {
    for (const line of day.items ?? []) {
      for (const id of lineAmounts(line as unknown as StockLineInput & { selectedPortion?: unknown }).keys()) out.add(id);
    }
  }
  return [...out];
}

/** For the order handlers: looks at the items of an order after it started to count. Never throws. */
export async function checkStockAlertsSafe(orderId: string): Promise<void> {
  try {
    const found = await db.readOne<{ items?: Array<{ items?: Array<Record<string, unknown>> }> }>('orders', { orderId } as never);
    const order = found.success ? found.data : null;
    if (!order) return;
    await checkStockAlerts(foodIdsOfOrder(order));
  } catch (error) {
    console.error('[stock-alert] check failed', { orderId, message: error instanceof Error ? error.message : String(error) });
  }
}

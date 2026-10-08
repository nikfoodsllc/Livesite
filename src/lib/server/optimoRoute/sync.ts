import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { optimoMode } from './config';
import { createStop, deleteStop, searchOrdersForDate } from './client';
import { buildOptimoOrder, deliveryDaysOf, findExistingStop, isRouteOrder, stopKeyFor, type ExistingOptimoOrder } from './stops';

/**
 * Keeps OptimoRoute in step with confirmed orders.
 *
 * - A stop is sent when an order is paid (the Stripe webhook, an admin cash order, "paid another way") and by the
 *   10-minute reconcile job for anything that was missed.
 * - Our own record of every stop is the `optimoStops` collection (one document per customer per day, with the orders
 *   behind it), so two events for one payment, or two orders for one customer and day, never create a second stop.
 * - Before creating, OptimoRoute is asked what it already has for that day: a stop with the same phone and street (for
 *   example Kunal's own upload) is adopted instead of duplicated.
 * - A stop whose orders are all cancelled / fully refunded is removed (when OptimoRoute allows it; otherwise it is
 *   flagged `remove_failed` so it is visible).
 * Nothing here ever throws into a payment: callers use syncOrderSafely.
 */

const LOCK_STALE_MS = 2 * 60 * 1000;
const STOPS = 'optimoStops';

export type StopState = 'new' | 'creating' | 'sent' | 'adopted' | 'failed' | 'removed' | 'remove_failed';

export interface StopDoc {
  stopKey: string;
  date: string;
  orderIds: string[];
  state: StopState;
  optimoId?: string;
  optimoOrderNo?: string;
  attempts?: number;
  lastError?: string;
  lock?: { at: Date };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StopOutcome {
  date: string;
  stopKey: string;
  result: 'sent' | 'adopted' | 'already' | 'in_progress' | 'failed' | 'would_create' | 'would_adopt' | 'past' | 'removed' | 'remove_failed' | 'kept' | 'would_remove';
  orderNo?: string;
  error?: string;
}

/** Today in Pacific time as YYYY-MM-DD (the delivery days are Pacific days). */
export function pacificToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

let indexReady = false;
async function stopsCollection() {
  const collection = await db.getCollectionForOperations<StopDoc>(STOPS);
  if (!indexReady) {
    await collection.createIndex({ stopKey: 1 }, { unique: true }).catch(() => undefined);
    await collection.createIndex({ date: 1, state: 1 }).catch(() => undefined);
    indexReady = true;
  }
  return collection;
}

const trim = (text: string | undefined) => (text ?? '').slice(0, 300);

/** Looks up OptimoRoute's orders for a day once per run. */
function dayLookup() {
  const cache = new Map<string, Promise<{ ok: boolean; list: ExistingOptimoOrder[]; error?: string }>>();
  return (date: string) => {
    let entry = cache.get(date);
    if (!entry) {
      entry = searchOrdersForDate(date).then((r) => ({ ok: r.ok, list: r.data ?? [], error: r.ok ? undefined : `${r.code ?? ''} ${r.message ?? ''}`.trim() }));
      cache.set(date, entry);
    }
    return entry;
  };
}

/** Sends (or in dry mode only reports) the stops of one order. */
export async function syncOrder(orderId: string, options: { now?: Date; lookup?: ReturnType<typeof dayLookup> } = {}): Promise<{ mode: string; outcomes: StopOutcome[] }> {
  const mode = optimoMode();
  if (mode === 'off') return { mode, outcomes: [] };
  const now = options.now ?? new Date();
  const found = await db.readOne<Order>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order) return { mode, outcomes: [] };
  if (!isRouteOrder(order)) return mode === 'on' ? releaseOrder(orderId, { now }) : { mode, outcomes: [] };

  const lookup = options.lookup ?? dayLookup();
  const today = pacificToday(now);
  const outcomes: StopOutcome[] = [];

  for (const day of deliveryDaysOf(order)) {
    const stopKey = stopKeyFor(order, day.date);
    if (day.date < today) {
      outcomes.push({ date: day.date, stopKey, result: 'past' });
      continue;
    }
    const payload = buildOptimoOrder(order, day.date);

    if (mode === 'dry') {
      const existing = await lookup(day.date);
      const match = existing.ok ? findExistingStop(existing.list, order) : undefined;
      outcomes.push({ date: day.date, stopKey, result: match ? 'would_adopt' : 'would_create', orderNo: payload.orderNo, error: existing.ok ? undefined : existing.error });
      continue;
    }

    const stops = await stopsCollection();
    const doc = await stops.findOneAndUpdate(
      { stopKey },
      { $addToSet: { orderIds: orderId }, $setOnInsert: { stopKey, date: day.date, state: 'new', attempts: 0, createdAt: now }, $set: { updatedAt: now } },
      { upsert: true, returnDocument: 'after' }
    );
    if (doc && (doc.state === 'sent' || doc.state === 'adopted')) {
      outcomes.push({ date: day.date, stopKey, result: 'already', orderNo: doc.optimoOrderNo });
      continue;
    }
    const claimed = await stops.findOneAndUpdate(
      { stopKey, $or: [{ state: { $in: ['new', 'failed', 'removed'] } }, { state: 'creating', 'lock.at': { $lt: new Date(now.getTime() - LOCK_STALE_MS) } }] },
      { $set: { state: 'creating', lock: { at: now }, updatedAt: now } },
      { returnDocument: 'after' }
    );
    if (!claimed) {
      outcomes.push({ date: day.date, stopKey, result: 'in_progress' });
      continue;
    }

    const existing = await lookup(day.date);
    if (!existing.ok) {
      // cannot tell whether OptimoRoute already has it: do not risk a duplicate, try again later
      await stops.updateOne({ stopKey }, { $set: { state: 'failed', lastError: trim(existing.error), updatedAt: new Date() }, $inc: { attempts: 1 }, $unset: { lock: '' } });
      outcomes.push({ date: day.date, stopKey, result: 'failed', error: trim(existing.error) });
      continue;
    }
    const match = findExistingStop(existing.list, order);
    if (match) {
      await stops.updateOne({ stopKey }, { $set: { state: 'adopted', optimoId: match.id, optimoOrderNo: match.orderNo ?? '', updatedAt: new Date() }, $unset: { lock: '', lastError: '' } });
      outcomes.push({ date: day.date, stopKey, result: 'adopted', orderNo: match.orderNo });
      continue;
    }
    const created = await createStop(payload);
    if (created.ok || created.code === 'ERR_ORD_EXISTS') {
      await stops.updateOne({ stopKey }, { $set: { state: created.ok ? 'sent' : 'adopted', optimoId: created.data?.id, optimoOrderNo: payload.orderNo, updatedAt: new Date() }, $unset: { lock: '', lastError: '' } });
      outcomes.push({ date: day.date, stopKey, result: created.ok ? 'sent' : 'adopted', orderNo: payload.orderNo });
    } else {
      const error = trim(`${created.code ?? ''} ${created.message ?? ''}`.trim());
      await stops.updateOne({ stopKey }, { $set: { state: 'failed', lastError: error, updatedAt: new Date() }, $inc: { attempts: 1 }, $unset: { lock: '' } });
      outcomes.push({ date: day.date, stopKey, result: 'failed', error, orderNo: payload.orderNo });
    }
  }

  if (mode === 'on' && outcomes.length > 0) await recordOnOrder(orderId, outcomes, now);
  return { mode, outcomes };
}

/** A short summary on the order itself, so the admin can see where it stands. */
async function recordOnOrder(orderId: string, outcomes: StopOutcome[], now: Date) {
  const relevant = outcomes.filter((o) => o.result !== 'past');
  if (relevant.length === 0) return;
  const failed = relevant.some((o) => o.result === 'failed' || o.result === 'remove_failed');
  const state = failed ? 'failed' : relevant.every((o) => o.result === 'removed') ? 'removed' : 'sent';
  await db.updateOne(
    'orders',
    { orderId } as never,
    { $set: { optimo: { state, at: now, stops: relevant.map((o) => ({ date: o.date, result: o.result, orderNo: o.orderNo, error: o.error })) } } } as never
  );
}

/** Takes an order (cancelled, refunded) off its stops; a stop with no live order left is removed from OptimoRoute. */
export async function releaseOrder(orderId: string, options: { now?: Date } = {}): Promise<{ mode: string; outcomes: StopOutcome[] }> {
  const mode = optimoMode();
  if (mode === 'off') return { mode, outcomes: [] };
  const now = options.now ?? new Date();
  const today = pacificToday(now);
  const stops = await stopsCollection();
  const docs = await stops.find({ orderIds: orderId, date: { $gte: today }, state: { $in: ['sent', 'adopted', 'failed', 'new', 'remove_failed'] } }).toArray();
  const outcomes: StopOutcome[] = [];
  for (const doc of docs) {
    const others = doc.orderIds.filter((id) => id !== orderId);
    let live = 0;
    if (others.length > 0) {
      const read = await db.read<Order>('orders', { orderId: { $in: others } } as never);
      live = (read.success ? read.data ?? [] : []).filter((o: Order) => isRouteOrder(o)).length;
    }
    if (live > 0) {
      if (mode === 'on') await stops.updateOne({ stopKey: doc.stopKey }, { $pull: { orderIds: orderId }, $set: { updatedAt: now } });
      outcomes.push({ date: doc.date, stopKey: doc.stopKey, result: 'kept' });
      continue;
    }
    if (mode === 'dry') {
      outcomes.push({ date: doc.date, stopKey: doc.stopKey, result: 'would_remove', orderNo: doc.optimoOrderNo });
      continue;
    }
    if (doc.state === 'failed' || doc.state === 'new') {
      await stops.updateOne({ stopKey: doc.stopKey }, { $set: { state: 'removed', updatedAt: now }, $pull: { orderIds: orderId } });
      outcomes.push({ date: doc.date, stopKey: doc.stopKey, result: 'removed' });
      continue;
    }
    const removed = await deleteStop({ id: doc.optimoId, orderNo: doc.optimoOrderNo || undefined });
    if (removed.ok || removed.code === 'ERR_ORD_NOT_FOUND') {
      await stops.updateOne({ stopKey: doc.stopKey }, { $set: { state: 'removed', updatedAt: now }, $pull: { orderIds: orderId }, $unset: { lastError: '' } });
      outcomes.push({ date: doc.date, stopKey: doc.stopKey, result: 'removed' });
    } else {
      const error = trim(`${removed.code ?? ''} ${removed.message ?? ''}`.trim());
      await stops.updateOne({ stopKey: doc.stopKey }, { $set: { state: 'remove_failed', lastError: error, updatedAt: now } });
      outcomes.push({ date: doc.date, stopKey: doc.stopKey, result: 'remove_failed', error });
    }
  }
  if (mode === 'on' && outcomes.length > 0) await recordOnOrder(orderId, outcomes, now);
  return { mode, outcomes };
}

/** For payment handlers: never throws, and gives up waiting after a few seconds (the reconcile job finishes the rest). */
export async function syncOrderSafely(orderId: string, waitMs = 9000): Promise<void> {
  if (optimoMode() === 'off') return;
  try {
    await Promise.race([
      syncOrder(orderId),
      new Promise((resolve) => setTimeout(resolve, waitMs)),
    ]);
  } catch (error) {
    console.error('[optimoroute] sync failed', { orderId, message: error instanceof Error ? error.message : String(error) });
  }
}

export interface ReconcileSummary {
  mode: string;
  ordersChecked: number;
  sent: number;
  adopted: number;
  failed: number;
  removed: number;
  removeFailed: number;
  stoppedEarly: boolean;
}

/**
 * The safety net, run every 10 minutes: sends any paid order whose upcoming stops are missing or failed, and removes
 * stops whose orders have since been cancelled or fully refunded (also done by an admin in the admin panel, which does
 * not call this site).
 */
export async function reconcile(options: { now?: Date; budgetMs?: number } = {}): Promise<ReconcileSummary> {
  const mode = optimoMode();
  const summary: ReconcileSummary = { mode, ordersChecked: 0, sent: 0, adopted: 0, failed: 0, removed: 0, removeFailed: 0, stoppedEarly: false };
  if (mode === 'off') return summary;
  const now = options.now ?? new Date();
  const started = Date.now();
  const budget = options.budgetMs ?? 45000;
  const today = pacificToday(now);
  const lookup = dayLookup();
  const stops = await stopsCollection();

  const tally = (outcomes: StopOutcome[]) => {
    for (const o of outcomes) {
      if (o.result === 'sent') summary.sent++;
      else if (o.result === 'adopted') summary.adopted++;
      else if (o.result === 'failed') summary.failed++;
      else if (o.result === 'removed') summary.removed++;
      else if (o.result === 'remove_failed') summary.removeFailed++;
    }
  };

  // 1. paid orders with an upcoming delivery day whose stop is not sent yet
  const read = await db.read<Order>('orders', {
    paymentStatus: 'paid',
    status: { $ne: 'cancelled' },
    $or: [{ 'items.deliveryDate': { $gte: today } }, { 'items.actualDeliveryDate': { $gte: today } }],
  } as never, { limit: 500 } as never);
  const orders = (read.success ? read.data ?? [] : []) as Order[];
  const wanted = orders.map((o) => ({ order: o, keys: deliveryDaysOf(o).filter((d) => d.date >= today).map((d) => stopKeyFor(o, d.date)) })).filter((x) => x.keys.length > 0);
  const known = await stops.find({ stopKey: { $in: wanted.flatMap((x) => x.keys) } }).toArray();
  const done = new Set(known.filter((k) => k.state === 'sent' || k.state === 'adopted').map((k) => k.stopKey));
  for (const { order, keys } of wanted) {
    if (keys.every((k) => done.has(k))) continue;
    if (Date.now() - started > budget) {
      summary.stoppedEarly = true;
      break;
    }
    summary.ordersChecked++;
    tally((await syncOrder(order.orderId, { now, lookup })).outcomes);
  }

  // 2. stops whose orders were cancelled or fully refunded
  const live = await stops.find({ date: { $gte: today }, state: { $in: ['sent', 'adopted', 'remove_failed'] } }).toArray();
  const ids = [...new Set(live.flatMap((s) => s.orderIds))];
  if (ids.length > 0) {
    const all = await db.read<Order>('orders', { orderId: { $in: ids } } as never, { limit: 1000 } as never);
    const eligible = new Set(((all.success ? all.data ?? [] : []) as Order[]).filter((o) => isRouteOrder(o)).map((o) => o.orderId));
    const gone = ids.filter((id) => !eligible.has(id));
    for (const orderId of gone) {
      if (Date.now() - started > budget) {
        summary.stoppedEarly = true;
        break;
      }
      tally((await releaseOrder(orderId, { now })).outcomes);
    }
  }
  return summary;
}

export interface DatePreview {
  date: string;
  /** Stops we would have for that day (paid orders, one per customer) */
  ourStops: number;
  /** Orders OptimoRoute has for that day */
  inOptimoRoute: number;
  /** Already sent or adopted by this sync */
  recorded: number;
  /** Not in OptimoRoute yet: would be created */
  wouldCreate: string[];
  /** Already in OptimoRoute (same phone + street), would be adopted */
  wouldAdopt: string[];
  /** In OptimoRoute but no paid order of ours behind it (extra stops, e.g. added by hand) */
  onlyInOptimoRoute: number;
}

/**
 * Read-only comparison of one delivery day: our paid orders against what OptimoRoute has. Works whenever the API key
 * exists, whatever the sync mode, and writes nothing anywhere.
 */
export async function previewDate(date: string): Promise<DatePreview | { error: string }> {
  const read = await db.read<Order>('orders', {
    paymentStatus: 'paid',
    status: { $ne: 'cancelled' },
    $or: [{ 'items.deliveryDate': date }, { 'items.actualDeliveryDate': date }],
  } as never, { limit: 500 } as never);
  const orders = ((read.success ? read.data ?? [] : []) as Order[]).filter((o) => deliveryDaysOf(o).some((d) => d.date === date));
  const byKey = new Map<string, Order>();
  for (const order of orders) {
    const key = stopKeyFor(order, date);
    if (!byKey.has(key)) byKey.set(key, order);
  }
  const existing = await searchOrdersForDate(date);
  if (!existing.ok) return { error: `${existing.code ?? ''} ${existing.message ?? ''}`.trim() || 'Could not read OptimoRoute' };
  const stops = await stopsCollection();
  const known = await stops.find({ stopKey: { $in: [...byKey.keys()] } }).toArray();
  const recorded = new Set(known.filter((k) => k.state === 'sent' || k.state === 'adopted').map((k) => k.stopKey));
  const wouldCreate: string[] = [];
  const wouldAdopt: string[] = [];
  const matchedOptimo = new Set<ExistingOptimoOrder>();
  for (const [key, order] of byKey) {
    const match = findExistingStop(existing.data ?? [], order);
    if (match) matchedOptimo.add(match);
    if (recorded.has(key)) continue;
    (match ? wouldAdopt : wouldCreate).push(order.orderId);
  }
  return {
    date,
    ourStops: byKey.size,
    inOptimoRoute: (existing.data ?? []).length,
    recorded: recorded.size,
    wouldCreate,
    wouldAdopt,
    onlyInOptimoRoute: (existing.data ?? []).filter((o) => !matchedOptimo.has(o)).length,
  };
}

import { db } from '@/lib/server/db';
import { completionDetails } from './client';
import { canMarkPartiallyDelivered, deliveriesByDay, orderDeliveryOutcome } from './completionRules';

/**
 * One-off catch-up for the Partially Delivered status: orders that already have some delivery days completed in OptimoRoute
 * (before this status existed) are moved to Partially Delivered, with the result of each day saved on the order. It reads the
 * stop records the 30-minute job keeps, and asks OptimoRoute (read only) about stops in the range that were never recorded as
 * finished. Orders whose days are ALL done, orders with nothing done, cancelled and unpaid orders are never changed; the counts
 * say how many of each there were. Safe to run again.
 */
export interface PartialBackfillResult {
  dryRun: boolean;
  from: string;
  to: string;
  stopsInRange: number;
  stopsAsked: number;
  stopsRecorded: number;
  ordersLooked: number;
  toPartial: number;
  alreadyPartial: number;
  allDone: number;
  nothingDone: number;
  notEligible: number;
  /** order ids that were (or, in a dry run, would be) changed: ids only, no customer details */
  changed: string[];
  /** OptimoRoute could not answer for some stops: they were left as unknown */
  askError?: string;
  error?: string;
}

interface StopRow {
  stopKey: string;
  date: string;
  orderIds?: string[];
  optimoId?: string;
  state: string;
  completion?: { status?: string; at?: string | null };
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function backfillPartialDelivered(from: string, to: string, dryRun: boolean, now: Date = new Date()): Promise<PartialBackfillResult> {
  const result: PartialBackfillResult = { dryRun, from, to, stopsInRange: 0, stopsAsked: 0, stopsRecorded: 0, ordersLooked: 0, toPartial: 0, alreadyPartial: 0, allDone: 0, nothingDone: 0, notEligible: 0, changed: [] };
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to) return { ...result, error: 'Pick a valid range (from, to as YYYY-MM-DD).' };
  const stops = await db.getCollectionForOperations<StopRow>('optimoStops');
  const orders = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  const inRange = await stops.find({ date: { $gte: from, $lte: to }, state: { $in: ['sent', 'adopted'] } }).toArray();
  result.stopsInRange = inRange.length;

  // stops in the range that were never recorded as finished: ask OptimoRoute (read only) how they went
  const open = inRange.filter((s) => typeof s.optimoId === 'string' && s.optimoId.length > 0 && !['success', 'failed', 'rejected'].includes(s.completion?.status ?? ''));
  const fresh = new Map<string, { status?: string; at?: string | null }>();
  for (let i = 0; i < open.length; i += 80) {
    const chunk = open.slice(i, i + 80);
    result.stopsAsked += chunk.length;
    const details = await completionDetails(chunk.map((s) => s.optimoId as string));
    if (!details.ok) {
      // those stops stay unknown (not counted as delivered); the rest of the catch-up carries on
      result.askError = `${details.code ?? ''} ${details.message ?? ''}`.trim() || 'no answer';
      continue;
    }
    for (const s of chunk) {
      const info = details.data?.[s.optimoId as string];
      if (info?.status === 'success' || info?.status === 'failed' || info?.status === 'rejected') fresh.set(s.stopKey, { status: info.status, at: info.endUtc ?? null });
    }
  }
  if (!dryRun) {
    for (const s of open) {
      const f = fresh.get(s.stopKey);
      if (f) await stops.updateOne({ stopKey: s.stopKey }, { $set: { completion: f } });
    }
    result.stopsRecorded = fresh.size;
  }

  const orderIds = [...new Set(inRange.flatMap((s) => s.orderIds ?? []))];
  result.ordersLooked = orderIds.length;
  for (const orderId of orderIds) {
    const order = await orders.findOne({ orderId }, { projection: { status: 1, paymentStatus: 1 } });
    if (!order) continue;
    const mine = await stops.find({ orderIds: orderId, state: { $in: ['sent', 'adopted'] } }).toArray();
    const status = (s: StopRow) => fresh.get(s.stopKey)?.status ?? s.completion?.status;
    const outcome = orderDeliveryOutcome(mine.map(status));
    const lite = order as { status?: string; paymentStatus?: string };
    if (outcome === 'delivered') result.allDone++;
    else if (outcome !== 'partial') result.nothingDone++;
    else if (lite.status === 'partially_delivered') result.alreadyPartial++;
    else if (!canMarkPartiallyDelivered(lite)) result.notEligible++;
    else {
      result.toPartial++;
      result.changed.push(orderId);
      if (!dryRun) {
        const progress = deliveriesByDay(mine.map((s) => ({ date: s.date, status: status(s), at: fresh.get(s.stopKey)?.at ?? s.completion?.at ?? null })));
        await orders.updateOne(
          { orderId, status: { $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery'] } },
          { $set: { status: 'partially_delivered', updatedAt: now, partiallyDeliveredAt: now, 'optimo.deliveries': progress } }
        );
      }
    }
  }
  return result;
}

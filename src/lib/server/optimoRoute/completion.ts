import { db } from '@/lib/server/db';
import { addDays } from '@/lib/orderReschedule';
import { optimoMode } from './config';
import { completionDetails } from './client';
import { canMarkDelivered, orderDeliveryOutcome } from './completionRules';
import { pacificToday } from './sync';

/**
 * Marks orders Delivered by itself when the drivers have completed all of their stops in OptimoRoute (user request
 * 2026-10-08). Runs with the 30-minute job for yesterday's and today's stops. The status is written exactly like the admin's
 * "Update Order Status" does (status + updatedAt), plus deliveredAt and who did it. A failed or rejected stop is only recorded.
 *
 *   OPTIMOROUTE_COMPLETION unset or 'off'  nothing happens (the default)
 *   OPTIMOROUTE_COMPLETION=dry             only counts what it would do
 *   OPTIMOROUTE_COMPLETION=on              updates stops and orders (also needs OPTIMOROUTE_SYNC=on)
 */
export type CompletionMode = 'off' | 'dry' | 'on';

export function completionMode(env: Record<string, string | undefined> = process.env): CompletionMode {
  if (optimoMode(env) !== 'on') return 'off';
  const flag = (env.OPTIMOROUTE_COMPLETION ?? 'off').trim().toLowerCase();
  return flag === 'on' ? 'on' : flag === 'dry' ? 'dry' : 'off';
}

export interface CompletionSummary {
  mode: CompletionMode;
  stopsChecked: number;
  stopsSucceeded: number;
  stopsProblem: number;
  ordersDelivered: number;
  ordersWithProblem: number;
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

export async function runCompletionSync(now: Date = new Date()): Promise<CompletionSummary> {
  const mode = completionMode();
  const summary: CompletionSummary = { mode, stopsChecked: 0, stopsSucceeded: 0, stopsProblem: 0, ordersDelivered: 0, ordersWithProblem: 0 };
  if (mode === 'off') return summary;
  try {
    const today = pacificToday(now);
    const dates = [addDays(today, -1), today];
    const stops = await db.getCollectionForOperations<StopRow>('optimoStops');
    const orders = await db.getCollectionForOperations<Record<string, unknown>>('orders');
    const rows = await stops.find({ date: { $in: dates }, state: { $in: ['sent', 'adopted'] }, optimoId: { $exists: true, $ne: '' }, 'completion.status': { $nin: ['success', 'failed', 'rejected'] } }).toArray();
    // a stop record without an OptimoRoute id cannot be looked up
    const open = rows.filter((s) => typeof s.optimoId === 'string' && s.optimoId.length > 0);
    summary.stopsChecked = open.length;
    if (open.length === 0) return summary;
    const details = await completionDetails(open.map((s) => s.optimoId as string));
    if (!details.ok) {
      summary.error = `${details.code ?? ''} ${details.message ?? ''}`.trim();
      return summary;
    }
    const touchedOrders = new Set<string>();
    for (const stop of open) {
      const info = details.data?.[stop.optimoId as string];
      if (!info?.status) continue;
      const finished = info.status === 'success' || info.status === 'failed' || info.status === 'rejected';
      if (info.status === 'success') summary.stopsSucceeded++;
      if (info.status === 'failed' || info.status === 'rejected') summary.stopsProblem++;
      if (mode === 'on') await stops.updateOne({ stopKey: stop.stopKey }, { $set: { completion: { status: info.status, at: info.endUtc ?? null } } });
      if (finished) for (const id of stop.orderIds ?? []) touchedOrders.add(id);
    }
    for (const orderId of touchedOrders) {
      const order = await orders.findOne({ orderId }, { projection: { status: 1, paymentStatus: 1 } });
      if (!order) continue;
      const mine = await stops.find({ orderIds: orderId, state: { $in: ['sent', 'adopted'] } }).toArray();
      // in dry mode the stop records were not updated, so read the fresh answers
      const statuses = mine.map((s) => (mode === 'dry' ? details.data?.[s.optimoId as string]?.status ?? s.completion?.status : s.completion?.status));
      const outcome = orderDeliveryOutcome(statuses);
      if (outcome === 'delivered' && canMarkDelivered(order as { status?: string; paymentStatus?: string })) {
        summary.ordersDelivered++;
        if (mode === 'on') {
          const lastEnd = mine.map((s) => s.completion?.at).filter(Boolean).sort().pop();
          await orders.updateOne(
            { orderId, status: { $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery'] } },
            { $set: { status: 'delivered', updatedAt: now, deliveredAt: lastEnd ? new Date(`${lastEnd}Z`) : now, deliveredBy: 'optimoroute' } }
          );
        }
      } else if (outcome === 'issue') {
        summary.ordersWithProblem++;
        if (mode === 'on') {
          const bad = mine.find((s) => s.completion?.status === 'failed' || s.completion?.status === 'rejected');
          await orders.updateOne({ orderId }, { $set: { 'optimo.deliveryIssue': { date: bad?.date ?? null, status: bad?.completion?.status ?? 'failed', at: now } } });
        }
      }
    }
    return summary;
  } catch (error) {
    console.error('[optimoroute] completion step failed', error instanceof Error ? error.message : String(error));
    return { ...summary, error: 'completion step failed' };
  }
}

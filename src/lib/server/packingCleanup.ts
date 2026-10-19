import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { dayOf } from '@/lib/server/optimoRoute/stops';

/**
 * The Packing Planner saves how long each customer's packing took, per delivery date and route (collection `packingRuns`).
 * When an order is deleted its customer's stop must not stay in those times: the stop is removed from every run of the order's
 * delivery days, or, when the stop holds other orders of the same customer, only this order is taken off it.
 * Returns how many stops were removed or changed. Never throws (the delete must not fail because of it).
 */
export async function removeOrderFromPackingRuns(order: Pick<Order, 'orderId' | 'items'>): Promise<{ removed: number; changed: number }> {
  const result = { removed: 0, changed: 0 };
  try {
    const dates = new Set<string>();
    for (const day of order.items ?? []) {
      const a = dayOf(day.actualDeliveryDate);
      const b = dayOf(day.deliveryDate);
      if (a) dates.add(a);
      if (b) dates.add(b);
    }
    if (dates.size === 0) return result;
    const runs = await db.getCollectionForOperations<{ _id: unknown; date: string; currentStopKey?: string | null; stops?: Record<string, { meta?: { orderIds?: string[] } }> }>('packingRuns');
    const docs = await runs.find({ date: { $in: [...dates] } } as never).toArray();
    for (const run of docs) {
      const $unset: Record<string, ''> = {};
      const $set: Record<string, unknown> = {};
      for (const [key, stop] of Object.entries(run.stops ?? {})) {
        const ids = stop?.meta?.orderIds ?? [];
        const belongs = ids.includes(order.orderId) || key.includes(order.orderId);
        if (!belongs) continue;
        const rest = ids.filter((id) => id !== order.orderId);
        if (rest.length === 0) {
          $unset[`stops.${key}`] = '';
          if (run.currentStopKey === key) $set.currentStopKey = null;
          result.removed += 1;
        } else {
          $set[`stops.${key}.meta.orderIds`] = rest;
          result.changed += 1;
        }
      }
      if (Object.keys($unset).length === 0 && Object.keys($set).length === 0) continue;
      await runs.updateOne({ _id: run._id } as never, { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) } as never);
    }
  } catch (error) {
    console.error('[order-delete] could not clean the packing times', { orderId: order.orderId, message: error instanceof Error ? error.message : String(error) });
  }
  return result;
}

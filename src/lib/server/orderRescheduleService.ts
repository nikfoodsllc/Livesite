import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { Order } from '@/types/order';
import {
  originalDates,
  planReschedule,
  type OrderLike,
  RESCHEDULABLE_STATUSES,
  staleDates,
  dateText,
  type RescheduleChange,
  type RescheduleInput,
} from '@/lib/orderReschedule';
import { moveOrderStops, pacificToday } from '@/lib/server/optimoRoute/sync';
import { sendDeliveryDateChangedEmail } from '@/lib/rescheduleEmail';
import type { MovedDelivery } from '@/templates/deliveryDateChanged';

/** One entry of an order's `reschedules` history (business only). */
export interface RescheduleRecord {
  at: Date;
  by: { id: string; name?: string };
  changes: RescheduleChange[];
}

/** When the customer was last told (business only). */
export interface RescheduleEmailRecord {
  sentAt: Date;
  by: { id: string; name?: string };
  messageId?: string;
  /** How many emails were sent about this order's date changes */
  count: number;
}

type OrderWithHistory = Order & { reschedules?: RescheduleRecord[]; rescheduleEmail?: RescheduleEmailRecord; rescheduleEmailLock?: { at: Date } };

export type ServiceResult<T> = ({ ok: true } & T) | { ok: false; status: number; error: string };

async function adminName(adminId: string): Promise<string | undefined> {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(adminId)) return undefined;
    const found = await db.readOne<{ name?: string; email?: string }>('users', { _id: new ObjectId(adminId) } as never);
    return found.success ? found.data?.name || found.data?.email : undefined;
  } catch {
    return undefined;
  }
}

async function loadOrder(orderId: string): Promise<OrderWithHistory | null> {
  const found = await db.readOne<OrderWithHistory>('orders', { orderId } as never);
  return found.success && found.data ? found.data : null;
}

export interface OptimoSummary {
  mode: string;
  /** Stops taken off the dates the order left, and stops sent for the dates it joined */
  removed: number;
  added: number;
  failed: number;
}

/**
 * Moves day lines of a paid order to other delivery dates. The order is saved first; the route planner is updated
 * after it and never blocks the move: if OptimoRoute cannot be reached, the 30-minute check finishes the job.
 */
export async function rescheduleOrder(
  orderId: string,
  inputs: RescheduleInput[],
  adminId: string,
  options: { now?: Date } = {}
): Promise<ServiceResult<{ orderId: string; changes: RescheduleChange[]; optimo: OptimoSummary; emailPending: true }>> {
  const now = options.now ?? new Date();
  const order = await loadOrder(orderId);
  if (!order) return { ok: false, status: 404, error: 'Order not found.' };

  const plan = planReschedule(order as unknown as OrderLike, inputs, pacificToday(now));
  if (!plan.ok) return { ok: false, status: plan.code === 'not_allowed' ? 409 : 400, error: plan.error };

  const record: RescheduleRecord = { at: now, by: { id: adminId, name: await adminName(adminId) }, changes: plan.changes };
  // only saves when the order still looks the way it did when it was read (nobody changed it meanwhile)
  const saved = await db.updateOne(
    'orders',
    { orderId, paymentStatus: 'paid', status: { $in: [...RESCHEDULABLE_STATUSES] }, items: order.items } as never,
    { $set: { items: plan.items, updatedAt: now }, $push: { reschedules: record } } as never
  );
  if (!saved.success) return { ok: false, status: 500, error: 'Could not save the new date.' };
  if (!saved.modifiedCount) return { ok: false, status: 409, error: 'The order was changed in the meantime. Reload it and try again.' };

  const left = staleDates(plan.oldDates, plan.newDates);
  const optimo = await updateRoutePlanner(orderId, left, now);
  return { ok: true, orderId, changes: plan.changes, optimo, emailPending: true };
}

async function updateRoutePlanner(orderId: string, left: string[], now: Date): Promise<OptimoSummary> {
  try {
    // never wait longer than a handful of seconds for OptimoRoute; the reconcile job repeats what did not finish
    const moved = await Promise.race([
      moveOrderStops(orderId, left, { now }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000)),
    ]);
    if (!moved) return { mode: 'timeout', removed: 0, added: 0, failed: 0 };
    const all = [...moved.removed, ...moved.added];
    return {
      mode: moved.mode,
      removed: moved.removed.filter((o) => o.result === 'removed').length,
      // only stops that were really put into the route planner for the new dates ('already' = that day was there before)
      added: moved.added.filter((o) => o.result === 'sent' || o.result === 'adopted').length,
      failed: all.filter((o) => o.result === 'failed' || o.result === 'remove_failed').length,
    };
  } catch (error) {
    console.error('[reschedule] Route planner update failed', { orderId, error: error instanceof Error ? error.message : String(error) });
    return { mode: 'error', removed: 0, added: 0, failed: 1 };
  }
}

/** For each day line that was moved: the date it was originally delivered on and the date it is on now, when they differ. */
export function movesToTell(order: OrderWithHistory): MovedDelivery[] {
  const firsts = originalDates(order.reschedules);
  const moves: MovedDelivery[] = [];
  for (const [index, original] of firsts) {
    const line = order.items?.[index];
    if (!line) continue;
    const toDate = dateText(line.actualDeliveryDate) || dateText(line.deliveryDate);
    if (toDate && original.deliveryDate && toDate !== original.deliveryDate) moves.push({ fromDate: original.deliveryDate, toDate });
  }
  return moves;
}

/** Emails the customer the new delivery dates. Only one send at a time per order (a double click sends one email). */
export async function sendRescheduleEmail(orderId: string, adminId: string, options: { now?: Date } = {}): Promise<ServiceResult<{ orderId: string; sentAt: string; moves: number }>> {
  const now = options.now ?? new Date();
  const order = await loadOrder(orderId);
  if (!order) return { ok: false, status: 404, error: 'Order not found.' };
  if (!order.reschedules || order.reschedules.length === 0) return { ok: false, status: 409, error: 'This order has not been moved to another date.' };
  if (order.status === 'cancelled') return { ok: false, status: 409, error: 'This order is cancelled.' };
  const moves = movesToTell(order);
  if (moves.length === 0) return { ok: false, status: 409, error: 'The delivery dates are back to the original ones, so there is nothing to tell the customer.' };

  const collection = await db.getCollectionForOperations<OrderWithHistory>('orders');
  const claimed = await collection.updateOne(
    { orderId, $or: [{ rescheduleEmailLock: { $exists: false } }, { 'rescheduleEmailLock.at': { $lt: new Date(now.getTime() - 90_000) } }] } as never,
    { $set: { rescheduleEmailLock: { at: now } } } as never
  );
  if (!claimed.modifiedCount) return { ok: false, status: 409, error: 'An email is already being sent for this order.' };

  try {
    const sent = await sendDeliveryDateChangedEmail(order, moves);
    if (!sent.success) return { ok: false, status: 502, error: sent.error || 'The email could not be sent.' };
    const record: RescheduleEmailRecord = {
      sentAt: now,
      by: { id: adminId, name: await adminName(adminId) },
      messageId: sent.messageId,
      count: (order.rescheduleEmail?.count ?? 0) + 1,
    };
    await collection.updateOne({ orderId } as never, { $set: { rescheduleEmail: record } } as never);
    return { ok: true, orderId, sentAt: now.toISOString(), moves: moves.length };
  } finally {
    await collection.updateOne({ orderId } as never, { $unset: { rescheduleEmailLock: '' } } as never).catch(() => undefined);
  }
}

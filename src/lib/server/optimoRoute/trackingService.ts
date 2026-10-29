import { db } from '@/lib/server/db';
import { optimoMode } from './config';
import { completionDetails, stopSchedule } from './client';
import { pacificToday } from './sync';
import { isDoNotNotify, trackingFor, type Tracking } from './trackingRules';

interface OrderLite {
  orderId: string;
  status?: string;
  items?: Array<{ deliveryDate?: unknown; actualDeliveryDate?: unknown }>;
}

const CACHE_MS = 45_000;

/** Only OptimoRoute's own tracking pages are handed to the app (it opens them in the phone's browser). */
export function safeTrackingUrl(url: string | undefined): string | undefined {
  try {
    const u = new URL(String(url));
    return u.protocol === 'https:' && (u.hostname === 'order.is' || u.hostname.endsWith('.order.is') || u.hostname.endsWith('optimoroute.com')) ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
const cache = new Map<string, { at: number; value: Tracking }>();

function deliveryDatesOf(order: OrderLite): string[] {
  const days = new Set<string>();
  for (const d of order.items ?? []) {
    const v = String(d.actualDeliveryDate ?? d.deliveryDate ?? '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) days.add(v);
  }
  return [...days].sort();
}

/**
 * What to show a customer about their delivery right now. Looks up today's stop in OptimoRoute (only when the sync is on and the order
 * has a delivery today); everything else is answered from the order itself. A short cache keeps many customers refreshing at
 * once from flooding OptimoRoute. Never throws: if OptimoRoute does not answer, the customer still gets "delivery today".
 */
export async function deliveryTracking(orderId: string, userId: string, now: Date = new Date()): Promise<Tracking | null> {
  const orders = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  const order = (await orders.findOne({ orderId, user: userId } as never, { projection: { orderId: 1, status: 1, items: 1 } })) as unknown as OrderLite | null;
  if (!order) return null;
  const dates = deliveryDatesOf(order);
  const today = pacificToday(now);
  const base = trackingFor({ dates, today, orderStatus: order.status });
  if (optimoMode() !== 'on' || !dates.includes(today) || order.status === 'cancelled') return base;

  const cached = cache.get(orderId);
  if (cached && now.getTime() - cached.at < CACHE_MS) return cached.value;

  try {
    const stops = await db.getCollectionForOperations<Record<string, unknown>>('optimoStops');
    const stop = (await stops.findOne({ date: today, orderIds: orderId, state: { $in: ['sent', 'adopted'] } } as never, { projection: { optimoId: 1 } })) as { optimoId?: string } | null;
    if (!stop?.optimoId) return base;
    const [schedule, completion] = await Promise.all([stopSchedule(stop.optimoId), completionDetails([stop.optimoId])]);
    // without the stop's communication preference we cannot tell whether this customer may see tracking: show only "delivery today"
    if (!schedule.ok) return base;
    const done = completion.ok ? completion.data?.[stop.optimoId] : undefined;
    const value = trackingFor({
      dates,
      today,
      orderStatus: order.status,
      stop: { liveArrival: schedule.data?.liveArrival, doNotNotify: isDoNotNotify(schedule.data?.notificationPreference), status: done?.status, endUtc: done?.endUtc, trackingUrl: safeTrackingUrl(done?.trackingUrl) },
    });
    cache.set(orderId, { at: now.getTime(), value });
    return value;
  } catch (error) {
    console.error('[tracking] could not read OptimoRoute', error instanceof Error ? error.message : error);
    return base;
  }
}

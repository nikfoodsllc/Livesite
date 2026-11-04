import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { addressLine } from './stops';
import { optimoMode } from './config';
import { pacificToday, type StopDoc } from './sync';
import { dueForFailedStop, fixedDue, isTransientError, plainReason, PLANNING_NOTE, TRANSIENT_ATTEMPTS_BEFORE_ALERT, type StopAlertKind } from './stopAlertRules';
import { adminOrdersUrl, sendStopAlertEmail } from '@/lib/stopAlertEmail';
import type { StopAlertInfo } from '@/templates/stopAlert';

/**
 * Tells support (ONLY support@nikfoods.com) about paid orders whose delivery stop is not in OptimoRoute: when it first fails, again
 * the evening before planning and on the morning of delivery if it is still broken, and once when it is fixed. Each email is sent
 * once per stop: it is claimed in the stop's record first, so two overlapping runs cannot both send it.
 * Runs at the end of every reconcile pass and right after an order's sync; never throws.
 */
interface AlertedStop extends StopDoc {
  alerts?: Partial<Record<StopAlertKind, Date>>;
}

const MAX_PER_RUN = 10;

const DAY_SHORT = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
const DAY_LONG = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);

function phoneText(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : '';
}

export function stopAlertInfoFor(stop: Pick<StopDoc, 'date' | 'lastError' | 'orderIds'>, order: Order | undefined, kind: StopAlertKind, env: Record<string, string | undefined> = process.env): StopAlertInfo {
  const first = stop.orderIds[0] ?? '';
  return {
    kind,
    orderId: order?.orderId ?? first,
    dayShort: DAY_SHORT.format(atNoon(stop.date)),
    dayLong: DAY_LONG.format(atNoon(stop.date)),
    customerName: String(order?.customerInfo?.name ?? ''),
    customerPhone: phoneText(order?.customerInfo?.phone),
    address: order ? addressLine(order) : '',
    reason: plainReason(stop.lastError),
    detail: (stop.lastError ?? '').slice(0, 200),
    otherOrders: Math.max(0, stop.orderIds.length - 1),
    adminUrl: adminOrdersUrl(env),
    planningNote: PLANNING_NOTE,
  };
}

async function claimAndSend(stop: AlertedStop, kind: StopAlertKind, now: Date): Promise<boolean> {
  const coll = await db.getCollectionForOperations<StopDoc>('optimoStops');
  const claimed = await coll.updateOne({ stopKey: stop.stopKey, [`alerts.${kind}`]: { $exists: false } } as never, { $set: { [`alerts.${kind}`]: now } } as never);
  if (claimed.modifiedCount !== 1) return false;
  const read = await db.read<Order>('orders', { orderId: stop.orderIds[0] } as never, { limit: 1 } as never);
  const order = read.success ? (read.data ?? [])[0] : undefined;
  const result = await sendStopAlertEmail(stopAlertInfoFor(stop, order, kind));
  if (!result.success) {
    // give the claim back so the next run tries again
    await coll.updateOne({ stopKey: stop.stopKey } as never, { $unset: { [`alerts.${kind}`]: '' } } as never);
    console.error('[stop-alert] email not sent', { kind, date: stop.date, message: result.error });
    return false;
  }
  return true;
}

export async function alertStopProblems(options: { now?: Date } = {}): Promise<{ sent: number }> {
  let sent = 0;
  try {
    if (optimoMode() !== 'on') return { sent };
    const now = options.now ?? new Date();
    const today = pacificToday(now);
    const coll = await db.getCollectionForOperations<AlertedStop>('optimoStops');
    const stops = await coll.find({ date: { $gte: today }, $or: [{ state: 'failed' }, { state: { $in: ['sent', 'adopted'] }, 'alerts.first': { $exists: true }, 'alerts.fixed': { $exists: false } }] }).limit(100).toArray();
    for (const stop of stops) {
      if (sent >= MAX_PER_RUN) break;
      let kind: StopAlertKind | null = null;
      if (stop.state === 'failed') {
        if (isTransientError(stop.lastError) && (stop.attempts ?? 0) < TRANSIENT_ATTEMPTS_BEFORE_ALERT) continue;
        kind = dueForFailedStop({ date: stop.date, today, now, alerts: stop.alerts });
      } else if (fixedDue({ state: stop.state, alerts: stop.alerts })) {
        kind = 'fixed';
      }
      if (!kind) continue;
      if (sent > 0) await new Promise((resolve) => setTimeout(resolve, 700)); // Resend allows about 2 sends a second
      if (await claimAndSend(stop, kind, now)) sent++;
    }
  } catch (error) {
    console.error('[stop-alert] check failed', error instanceof Error ? error.message : String(error));
  }
  return { sent };
}

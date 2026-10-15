/**
 * What drivers report in OptimoRoute decides an order's delivery status, as pure rules.
 * An order is Delivered when EVERY one of its stops (an order can have several delivery days) was completed successfully.
 * When only some stops were completed (say Wednesday delivered, Friday still to come) it is Partially Delivered, and the day
 * it was completed is kept so the admin can see which days are done. A failed or rejected stop is also recorded on the order
 * so the team can follow up.
 */
export const DELIVERABLE_STATUSES = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'partially_delivered'] as const;

export type DeliveryOutcome = 'delivered' | 'partial' | 'issue' | 'pending';

const isFailed = (s: string | undefined) => s === 'failed' || s === 'rejected';

export function orderDeliveryOutcome(stopStatuses: Array<string | undefined>): DeliveryOutcome {
  if (stopStatuses.length === 0) return 'pending';
  if (stopStatuses.every((s) => s === 'success')) return 'delivered';
  if (stopStatuses.some((s) => s === 'success')) return 'partial';
  return stopStatuses.some(isFailed) ? 'issue' : 'pending';
}

/** One delivery day of an order and how it went: what the admin shows when you hover over Partially Delivered. */
export interface DayDelivery {
  date: string;
  status: 'delivered' | 'failed' | 'pending';
  /** When the driver completed it (UTC, ISO), for a delivered day */
  at?: string | null;
}

/** The per-day result of an order's stops: a day is delivered when all of its stops are, failed when one failed, else pending. */
export function deliveriesByDay(stops: Array<{ date: string; status?: string; at?: string | null }>): DayDelivery[] {
  const byDay = new Map<string, Array<{ status?: string; at?: string | null }>>();
  for (const s of stops) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const status: DayDelivery['status'] = list.every((s) => s.status === 'success') ? 'delivered' : list.some((s) => isFailed(s.status)) ? 'failed' : 'pending';
      const at = status === 'delivered' ? list.map((s) => s.at).filter((x): x is string => Boolean(x)).sort().pop() ?? null : null;
      return { date, status, at };
    });
}

/** Only a paid order that is still on its way gets marked delivered or partly delivered (never a cancelled, refunded or already delivered one). */
export function canMarkDelivered(order: { status?: string; paymentStatus?: string }): boolean {
  return order.paymentStatus === 'paid' && (DELIVERABLE_STATUSES as readonly string[]).includes(order.status ?? '');
}

/** Whether an order may move to Partially Delivered: paid, and on its way but not already partly delivered. */
export function canMarkPartiallyDelivered(order: { status?: string; paymentStatus?: string }): boolean {
  return canMarkDelivered(order) && order.status !== 'partially_delivered';
}

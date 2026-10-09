/**
 * What drivers report in OptimoRoute decides an order's delivery status, as pure rules.
 * An order is Delivered when EVERY one of its stops (an order can have several delivery days) was completed successfully.
 * A failed or rejected stop never changes the status by itself: it is recorded on the order so the team can follow up.
 */
export const DELIVERABLE_STATUSES = ['confirmed', 'preparing', 'ready', 'out_for_delivery'] as const;

export type DeliveryOutcome = 'delivered' | 'issue' | 'pending';

export function orderDeliveryOutcome(stopStatuses: Array<string | undefined>): DeliveryOutcome {
  if (stopStatuses.length === 0) return 'pending';
  if (stopStatuses.some((s) => s === 'failed' || s === 'rejected')) return 'issue';
  return stopStatuses.every((s) => s === 'success') ? 'delivered' : 'pending';
}

/** Only a paid order that is still on its way gets marked delivered (never a cancelled, refunded or already delivered one). */
export function canMarkDelivered(order: { status?: string; paymentStatus?: string }): boolean {
  return order.paymentStatus === 'paid' && (DELIVERABLE_STATUSES as readonly string[]).includes(order.status ?? '');
}

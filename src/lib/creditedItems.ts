import type { Order, OrderDay } from '@/types/order';

/**
 * Items an admin gave store credit for are not made or delivered any more. This returns the order's days with every
 * credited quantity taken off (order.creditsIssued[].items[] = { line, item, quantity }): an item credited in full is
 * dropped, and so is a day with nothing left. An order with no days left was credited entirely.
 * Keep in step with admin/src/lib/creditAdjust.ts (the same rule for the reports).
 */
export function daysAfterCredits(order: Pick<Order, 'items' | 'creditsIssued'>): OrderDay[] {
  const days = (order.items ?? []) as OrderDay[];
  const credits = order.creditsIssued ?? [];
  if (credits.length === 0) return days;
  const credited = new Map<string, number>();
  for (const c of credits) for (const it of c.items ?? []) credited.set(`${it.line}:${it.item}`, (credited.get(`${it.line}:${it.item}`) ?? 0) + (Number(it.quantity) || 0));
  return days
    .map((day, line) => ({
      ...day,
      items: (day.items ?? [])
        .map((it, item) => ({ ...it, quantity: (Number(it.quantity) || 0) - (credited.get(`${line}:${item}`) ?? 0) }))
        .filter((it) => it.quantity > 0),
    }))
    .filter((day) => day.items.length > 0) as OrderDay[];
}

/** True when something on the order is still to be made and delivered. */
export function hasItemsLeft(order: Pick<Order, 'items' | 'creditsIssued'>): boolean {
  if ((order.creditsIssued ?? []).length === 0) return true;
  return daysAfterCredits(order).length > 0;
}

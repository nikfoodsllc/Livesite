import { formatDeliveryDate, formatPacificMoment } from '@/lib/server/orderCutoff';

/** A delivery day the server refused because ordering for it has closed. */
export interface ClosedDateInfo {
  date: string;
  closesAt: string;
}

/** The closed days from a refused checkout response (anything that is not a date + closing moment is ignored). */
export function parseClosedDates(value: unknown): ClosedDateInfo[] {
  if (!Array.isArray(value)) return [];
  const out: ClosedDateInfo[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const { date, closesAt } = entry as { date?: unknown; closesAt?: unknown };
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof closesAt === 'string' && !Number.isNaN(new Date(closesAt).getTime())) {
      out.push({ date, closesAt });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The red banner shown on checkout when days in the cart have closed: which days, when they closed, and what
 * we did about it (removed them from the cart, so the customer can carry on).
 */
export function closedDaysNotice(closed: ClosedDateInfo[], removedCount: number, daysLeft: number): string {
  const parts = closed.map((c) => `${formatDeliveryDate(c.date)} (closed ${formatPacificMoment(new Date(c.closesAt))} Pacific time)`);
  const list = parts.length === 0 ? 'some of the days in your cart' : parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  const many = closed.length > 1;
  if (removedCount === 0) {
    return `Ordering has closed for ${list}. Please remove ${many ? 'those days' : 'that day'} from your cart to continue.`;
  }
  const removed = `We removed ${removedCount > 1 || many ? 'them' : 'it'} from your cart`;
  return daysLeft > 0
    ? `Ordering has closed for ${list}. ${removed}, so you can continue with the rest of your order.`
    : `Ordering has closed for ${list}. ${removed}, so your cart is now empty.`;
}

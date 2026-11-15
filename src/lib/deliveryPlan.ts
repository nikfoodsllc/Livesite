import { calculateDeliveryDates } from '@/lib/deliveryCalculator';
import type { CartDay } from '@/types/cart';

/**
 * What the cart shows about delivery days comes from the same function checkout and order creation use
 * (`calculateDeliveryDates`), so the cart can never say one thing and the order do another.
 */

type DayShape = Pick<CartDay, 'date' | 'dayTotal'> & Partial<CartDay>;

const asCartDays = (days: DayShape[]): CartDay[] => days.map((d) => ({ ...d, items: d.items ?? [], day: (d.day ?? '') as CartDay['day'] })) as CartDay[];

/**
 * Where each day is delivered: a map from the day the items were picked for to the day they are delivered.
 * `null` when the order cannot be placed (all days together are under the minimum).
 */
export function planDeliveries(days: DayShape[], minValue: number): Map<string, string> | null {
  if (!days.length) return null;
  const result = calculateDeliveryDates(asCartDays(days), minValue);
  if (!result.deliveryDays.length) return null;
  return new Map(result.deliveryDays.map((d) => [d.originalDate, d.actualDeliveryDate]));
}

export interface OwnDayFix {
  /** dollars to add */
  amount: number;
  /** the day the money has to be added to (the day itself, or a later day that would otherwise be left short) */
  toDate: string;
}

/**
 * The smallest amount that gets `date` delivered on its own day, and the day to add it to. Found by trying amounts through the
 * real delivery calculation (in whole cents), so the answer is exactly what checkout would then do. `null` when the day is
 * already delivered on its own day, or no single addition (up to the minimum) would do it.
 */
export function ownDayFix(days: DayShape[], minValue: number, date: string): OwnDayFix | null {
  const base = planDeliveries(days, minValue);
  if (base && base.get(date) === date) return null;
  const sorted = [...days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const candidates = sorted.filter((d) => new Date(d.date).getTime() >= new Date(date).getTime()).map((d) => d.date);
  let best: OwnDayFix | null = null;
  for (const target of candidates) {
    for (let cents = 1; cents <= Math.round(minValue * 100); cents += 1) {
      const trial = sorted.map((d) => (d.date === target ? { ...d, dayTotal: d.dayTotal + cents / 100 } : d));
      const plan = planDeliveries(trial, minValue);
      if (plan && plan.get(date) === date) {
        if (!best || cents / 100 < best.amount) best = { amount: Math.round(cents) / 100, toDate: target };
        break;
      }
    }
  }
  return best;
}

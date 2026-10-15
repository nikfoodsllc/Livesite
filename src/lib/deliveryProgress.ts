/**
 * What a customer may know about the delivery days of an order: which days are delivered and which are not. The team's
 * record (`order.optimo.deliveries`) also says why a day failed; that never leaves the server, so a failed day is simply
 * "not delivered" here.
 */
export interface DeliveryProgressDay {
  date: string;
  delivered: boolean;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The customer's view of the per-day record, oldest day first (empty when there is none). */
export function customerDeliveryProgress(deliveries: unknown): DeliveryProgressDay[] {
  if (!Array.isArray(deliveries)) return [];
  const out: DeliveryProgressDay[] = [];
  for (const d of deliveries as Array<{ date?: unknown; status?: unknown }>) {
    const date = typeof d?.date === 'string' ? d.date : '';
    if (!DAY_RE.test(date)) continue;
    out.push({ date, delivered: d.status === 'delivered' });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** "1/2 Delivered" for a partly delivered order; the plain status label when the days are not known. */
export function partialDeliveredLabel(progress: DeliveryProgressDay[] | undefined, fallback: string): string {
  if (!progress || progress.length === 0) return fallback;
  return `${progress.filter((d) => d.delivered).length}/${progress.length} Delivered`;
}

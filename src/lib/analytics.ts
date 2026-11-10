/**
 * Google Analytics 4. The tag is set with the NEXT_PUBLIC_GA_MEASUREMENT_ID setting (G-XXXXXXXXXX). With no setting, nothing loads and
 * every call here does nothing, so the site works exactly as before.
 */
export const GA_ID = (() => {
  const id = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '').trim();
  return /^G-[A-Z0-9]{6,14}$/.test(id) ? id : '';
})();

type Gtag = (...args: unknown[]) => void;

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!GA_ID || typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === 'function') gtag('event', name, params);
}

interface PurchaseOrder {
  orderId: string;
  totalPaid: number;
  taxes?: number;
  tip?: number;
  items: Array<{ items: Array<{ food: { name?: string; _id?: unknown }; quantity: number; price: number }> }>;
}

/** The "purchase" event for a paid order, once per order per browser (a reload of the success page does not count again). */
export function trackPurchase(order: PurchaseOrder): void {
  if (!GA_ID || typeof window === 'undefined') return;
  const key = `ga_purchase_${order.orderId}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, '1');
  } catch {
    // storage blocked: still send, at worst a reload counts twice
  }
  const items = order.items.flatMap((day) => day.items.map((i) => ({ item_id: i.food?._id ? String(i.food._id) : undefined, item_name: i.food?.name, price: i.price, quantity: i.quantity })));
  trackEvent('purchase', { transaction_id: order.orderId, value: order.totalPaid, currency: 'USD', tax: order.taxes ?? 0, items });
}

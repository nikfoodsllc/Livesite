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

/**
 * Tells Analytics which customer a visit belongs to, using our internal customer id (never a name, email or phone number).
 * Pass null on log out. Safe to call repeatedly: it only changes what later events carry.
 */
export function setAnalyticsUser(userId: string | null): void {
  if (!GA_ID || typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === 'function') gtag('set', { user_id: userId });
}

interface FoodLike {
  _id?: unknown;
  name?: string;
}

const gaItem = (food: FoodLike | undefined, price: number, quantity: number) => ({
  item_id: food?._id ? String(food._id) : undefined,
  item_name: food?.name,
  price,
  quantity,
});

/** A customer opened an item's details. An item sold by size has no single price, so its lowest size price is used. */
export function trackViewItem(food: (FoodLike & { price?: number; portionPrices?: number[] }) | undefined): void {
  if (!food) return;
  const sizes = (food.portionPrices ?? []).filter((p) => Number.isFinite(p) && p > 0);
  const price = Number.isFinite(food.price) && (food.price ?? 0) > 0 ? (food.price as number) : sizes.length ? Math.min(...sizes) : 0;
  trackEvent('view_item', { currency: 'USD', value: price, items: [gaItem(food, price, 1)] });
}

/** Units were added to the cart (only the added amount, at the price of one). */
export function trackAddToCart(food: FoodLike | undefined, unitPrice: number, quantity: number): void {
  trackEvent('add_to_cart', { currency: 'USD', value: unitPrice * quantity, items: [gaItem(food, unitPrice, quantity)] });
}

interface CheckoutCartLike {
  totalAmount?: number;
  days: Array<{ items: Array<{ foodItem?: FoodLike; quantity: number; price?: number; totalPrice?: number }> }>;
}

const checkoutItems = (cart: CheckoutCartLike) =>
  cart.days.flatMap((d) => d.items.map((i) => gaItem(i.foodItem, i.price ?? (i.quantity ? (i.totalPrice ?? 0) / i.quantity : 0), i.quantity)));

/** The checkout page was opened with items in the cart: once per browser tab session. */
export function trackBeginCheckout(cart: CheckoutCartLike): void {
  if (!GA_ID || typeof window === 'undefined') return;
  try {
    if (window.sessionStorage.getItem('ga_begin_checkout')) return;
    window.sessionStorage.setItem('ga_begin_checkout', '1');
  } catch {
    // storage blocked: still send
  }
  trackEvent('begin_checkout', { currency: 'USD', value: cart.totalAmount ?? 0, items: checkoutItems(cart) });
}

/** The customer pressed Pay. */
export function trackAddPaymentInfo(cart: CheckoutCartLike): void {
  trackEvent('add_payment_info', { currency: 'USD', value: cart.totalAmount ?? 0, items: checkoutItems(cart) });
}

/** Units left the cart. */
export function trackRemoveFromCart(food: FoodLike | undefined, unitPrice: number, quantity: number): void {
  trackEvent('remove_from_cart', { currency: 'USD', value: unitPrice * quantity, items: [gaItem(food, unitPrice, quantity)] });
}

/** The cart page was opened. */
export function trackViewCart(value: number, itemCount: number): void {
  trackEvent('view_cart', { currency: 'USD', value, item_count: itemCount });
}

/** Someone typed a menu search (the words only; no account details). */
export function trackSearch(term: string): void {
  const t = term.trim().toLowerCase().slice(0, 60);
  if (t.length >= 2) trackEvent('search', { search_term: t });
}

/** A home banner was shown or tapped. */
export function trackPromotion(kind: 'view_promotion' | 'select_promotion', banner: { id: string; title?: string }, position: number): void {
  trackEvent(kind, { promotion_id: banner.id, promotion_name: banner.title || banner.id, creative_slot: String(position + 1) });
}

/** Signed in or created an account (the method only). */
export function trackAuth(kind: 'login' | 'sign_up', method: string): void {
  trackEvent(kind, { method });
}

/** Subscribed to menu alerts. */
export function trackLead(source: string): void {
  trackEvent('generate_lead', { source });
}

/** A card payment or its setup failed: where and Stripe's reason code (no card or customer details). */
export function trackPaymentError(stage: string, code?: string, declineCode?: string): void {
  trackEvent('payment_error', { stage, error_code: code ?? 'none', decline_code: declineCode ?? 'none' });
}

/** Items were taken out of the cart because their ordering time had passed. */
export function trackCutoffRemoval(removed: number): void {
  trackEvent('cutoff_items_removed', { count: removed });
}

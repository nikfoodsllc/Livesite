import type Stripe from 'stripe';
import type { Cart } from '@/types/cart';
import type { Order, PaymentErrorInfo } from '@/types/order';

/**
 * What we tell Stripe about a payment, and what we keep when one fails.
 *
 * Stripe metadata allows 50 keys, key names up to 40 characters and values up to 500 characters,
 * and an empty value deletes the key. So values are clipped and empty ones are left out.
 */
const MAX_VALUE_LENGTH = 480;

type Metadata = Record<string, string>;

function compact(values: Record<string, string | number | undefined | null>): Metadata {
  const out: Metadata = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text !== '') out[key] = text.slice(0, MAX_VALUE_LENGTH);
  }
  return out;
}

const money = (n: number | undefined) => (typeof n === 'number' ? n.toFixed(2) : undefined);

/**
 * The address the customer used (e.g. www.nikfoods.com or livesite-dev.vercel.app), so payments from
 * dev, preview and production can be told apart in Stripe. VERCEL_ENV can't do this: the dev project
 * treats its `staging` branch as its production branch, so it reports "production" too.
 */
export function siteFromHeaders(headers: { get(name: string): string | null }): string | undefined {
  const raw = headers.get('x-forwarded-host') || headers.get('host') || '';
  const host = raw.split(',')[0].trim().toLowerCase().slice(0, 100);
  return host || undefined;
}

/** Metadata for the draft PaymentIntent created when the checkout page loads (no order yet). */
export function buildDraftPaymentMetadata(input: {
  userId: string;
  customerEmail?: string;
  customerPhone?: string;
  cart: Cart;
  totalPaid: number;
  site?: string;
}): Metadata {
  const { userId, customerEmail, customerPhone, cart, totalPaid, site } = input;
  const dates = Array.from(new Set(cart.days.map((day) => day.date))).sort();
  const itemCount = cart.days.reduce(
    (sum, day) => sum + day.items.reduce((s, item) => s + item.quantity, 0),
    0
  );
  return compact({
    userId,
    checkoutDraft: 'true',
    customerEmail,
    customerPhone,
    zip: cart.selectedAddress?.zipCode,
    deliveryDates: dates.join(','),
    itemCount,
    cartTotal: money(totalPaid),
    site,
  });
}

/** Metadata attached once the order exists (replaces the draft marker with the order details). */
export function buildOrderPaymentMetadata(
  order: Omit<Order, '_id'>,
  site?: string
): Metadata {
  const dates = Array.from(
    new Set(
      order.items.map((day) => {
        const d = day.actualDeliveryDate ?? day.deliveryDate;
        return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
      })
    )
  ).sort();
  const itemCount = order.items.reduce(
    (sum, day) => sum + day.items.reduce((s, item) => s + item.quantity, 0),
    0
  );
  const metadata = compact({
    orderId: order.orderId,
    userId: order.user,
    customerEmail: order.customerInfo.email,
    customerPhone: order.customerInfo.phone,
    zip: order.address.zipCode,
    deliveryDates: dates.join(','),
    itemCount,
    subtotal: money(order.subtotal),
    platformFee: money(order.platformFee),
    deliveryFee: money(order.deliveryFee),
    tax: money(order.taxes),
    tip: money(order.tip),
    discount: order.discount ? money(order.discount.amount) : undefined,
    discountCode: order.discount?.code,
    total: money(order.totalPaid),
    site,
  });
  // An empty value tells Stripe to remove the draft marker set when the checkout page loaded
  return { ...metadata, checkoutDraft: '' };
}

/** Human-readable description shown in the Stripe dashboard. */
export function buildOrderDescription(order: Pick<Order, 'orderId' | 'customerInfo'>): string {
  const { name, email } = order.customerInfo;
  return `Order ${order.orderId} for ${name}${email ? ` <${email}>` : ''}`.slice(0, 1000);
}

/** The reason Stripe gives for a failed or canceled PaymentIntent, in a form we can store. */
export function paymentErrorFromIntent(
  intent: Pick<Stripe.PaymentIntent, 'last_payment_error' | 'cancellation_reason'>,
  fallbackCode: string,
  now: Date = new Date()
): PaymentErrorInfo {
  const err = intent.last_payment_error;
  return {
    code: err?.code || (intent.cancellation_reason ? `canceled_${intent.cancellation_reason}` : fallbackCode),
    declineCode: err?.decline_code || undefined,
    type: err?.type || undefined,
    message: (err?.message || (intent.cancellation_reason ? `Canceled: ${intent.cancellation_reason}` : 'Payment could not be processed.')).slice(0, 500),
    paymentMethodType: err?.payment_method?.type || undefined,
    at: now,
  };
}

const CLIENT_ERROR_STAGES = [
  'create_payment_intent',
  'create_order',
  'submit_form',
  'confirm_payment',
  'confirm_incomplete',
  'unexpected',
] as const;
export type ClientErrorStage = (typeof CLIENT_ERROR_STAGES)[number];

export interface ClientPaymentErrorInput {
  stage: ClientErrorStage;
  code?: string;
  declineCode?: string;
  type?: string;
  message: string;
  orderId?: string;
  paymentIntentId?: string;
}

const clip = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, max) : undefined;

/** Validates and trims what the browser reports about a payment error; null if unusable. */
export function parseClientPaymentError(body: unknown): ClientPaymentErrorInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const message = clip(b.message, 500);
  if (!message) return null;
  const stage = CLIENT_ERROR_STAGES.includes(b.stage as ClientErrorStage)
    ? (b.stage as ClientErrorStage)
    : 'unexpected';
  return {
    stage,
    message,
    code: clip(b.code, 100),
    declineCode: clip(b.declineCode, 100),
    type: clip(b.type, 100),
    orderId: clip(b.orderId, 100),
    paymentIntentId: clip(b.paymentIntentId, 100),
  };
}

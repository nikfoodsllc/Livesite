import Stripe from 'stripe';
import { db } from '@/lib/server/db';
import { Order, OrderDay, PaymentMethod } from '@/types/order';
import { CartItem } from '@/types/cart';
import {
  buildOfflineCart,
  BuiltOfflineCart,
  OfflineAddressInput,
  OfflineLineInput,
  priceLine,
  TIP_PERCENTAGES,
  weekdayOf,
  DATE_RE,
} from '@/lib/server/offlineOrder';
import { loadItemsForOrder } from '@/lib/server/offlineCatalog';
import { ensureCustomer, EMAIL_RE, normalizeEmail, normalizePhone, CustomerInput } from '@/lib/server/offlineCustomer';
import { buildPayLink, hashPaymentToken, newPaymentToken } from '@/lib/server/paymentLink';
import { buildOrderDescription, buildOrderPaymentMetadata } from '@/lib/server/stripePaymentInfo';
import { validateZipcodeServiceabilityServer } from '@/utils/zipcodeValidation';
import { calculateDeliveryDates } from '@/lib/deliveryCalculator';
import { convertCartToOrderItems, createAddressSnapshot, formatOrderForDatabase, generateOrderId } from '@/lib/orderHelpers';
import { sendPaymentLinkEmail } from '@/lib/offlineOrderEmail';
import { recordPaymentLinkEmailSent, type PaymentLinkEmailRecord, type PaymentLinkViews } from '@/lib/server/paymentLinkTracking';
import { sendOrderConfirmationEmail } from '@/lib/email';

const MAX_LINES = 60;

export type OfflinePayment =
  | { mode: 'link' }
  | { mode: 'offline'; /** how it was paid: Cash, Zelle or any text the admin typed (stored as the order's payment method) */ method: string; note?: string };

export interface OfflineOrderInput {
  customer: CustomerInput;
  address: OfflineAddressInput;
  lines: OfflineLineInput[];
  tipPercentage: number;
  waivePlatformFee?: boolean;
  allowBelowMinimum?: boolean;
  payment: OfflinePayment;
  /** One id per press of Create: a second request with the same id is refused, so a double tap or a retry cannot make the order twice */
  requestId: string;
}

export type ServiceFailure = { ok: false; status: number; error: string; problems?: string[]; code?: string; closedItems?: unknown };

interface Prepared {
  items: CartItem[];
  built: BuiltOfflineCart;
  orderItems: OrderDay[];
  warnings: string[];
}

/**
 * What the admin picked or typed for an order that was paid outside the website. Cash is stored the way the dashboard
 * already counts it ('Cash on Delivery'); Zelle and anything typed are stored as written (one line, 40 characters at
 * most). Returns null when nothing usable was given.
 */
export function normalizePaymentMethod(input: unknown): PaymentMethod | null {
  if (typeof input !== 'string') return null;
  const text = input.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (text.length === 0) return null;
  const lower = text.toLowerCase();
  if (lower === 'cash' || lower === 'cash on delivery') return 'Cash on Delivery';
  if (lower === 'zelle') return 'Zelle';
  return text as PaymentMethod;
}

function fail(status: number, error: string, extra: Partial<ServiceFailure> = {}): ServiceFailure {
  return { ok: false, status, error, ...extra };
}

/** Checks the lines and the delivery address, prices everything and totals it. Shared by the preview and the real thing. */
async function prepare(
  input: Pick<OfflineOrderInput, 'lines' | 'address' | 'tipPercentage' | 'waivePlatformFee'>
): Promise<{ ok: true; value: Prepared } | ServiceFailure> {
  const { lines, address, tipPercentage } = input;

  if (!Array.isArray(lines) || lines.length === 0) return fail(400, 'Add at least one item');
  if (lines.length > MAX_LINES) return fail(400, `An order can have at most ${MAX_LINES} lines`);
  if (!(TIP_PERCENTAGES as readonly number[]).includes(tipPercentage)) return fail(400, 'Tip must be 0, 5, 10 or 15 percent');
  if (!address?.postal_code || !/^\d{5}(-\d{4})?$/.test(address.postal_code)) return fail(400, 'Enter a 5 digit zip code for the delivery address');

  const badDate = lines.find((l) => typeof l.date !== 'string' || !DATE_RE.test(l.date));
  if (badDate) return fail(400, 'Every item needs a delivery day');

  // Create Order is the admin's master tool: no cutoff, no "day is open" and no "item is on that day's menu" rules.
  // Any date can be picked and any item of the menu can go on it; only the item itself has to exist.
  const loaded = await loadItemsForOrder(lines.map((l) => String(l.foodItemId)));
  const problems: string[] = [];
  const items: CartItem[] = [];
  lines.forEach((line, index) => {
    const item = loaded.get(String(line.foodItemId));
    if (!item) {
      problems.push('An item on the order is no longer on the menu. Remove it and add it again.');
      return;
    }
    const priced = priceLine(line, item, index);
    if ('problem' in priced) problems.push(priced.problem);
    else items.push(priced.item);
  });
  if (problems.length > 0) return fail(400, problems[0], { problems });

  // the delivery area is not enforced either: a zip outside it is allowed, with the standard minimum per day
  const zip = await validateZipcodeServiceabilityServer(address.postal_code.slice(0, 5), db);

  const built = buildOfflineCart({
    items,
    address,
    minOrderValue: zip.config?.minCartValue,
    tipPercentage,
    waivePlatformFee: input.waivePlatformFee,
  });

  // no minimum per day for the delivery plan either: each day is delivered on its own date
  const deliveryCalc = calculateDeliveryDates(built.cart.days, 0);
  const orderItems = convertCartToOrderItems(built.cart.days, deliveryCalc);
  return { ok: true, value: { items, built, orderItems, warnings: [] } };
}

export interface OfflinePreview {
  days: Array<{
    date: string;
    weekday: string;
    actualDeliveryDate?: string;
    message?: string;
    dayTotal: number;
    items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; portion?: string; spice?: string; eco?: boolean }>;
  }>;
  totals: BuiltOfflineCart['totals'];
  minOrderValue: number;
  canCheckout: boolean;
  /** Days under the area's minimum (a note only; they can still be ordered) */
  belowMinimum: Array<{ date: string; total: number }>;
  deliveryMessages: string[];
}

/** What the order would look like and cost, without saving anything. */
export async function previewOfflineOrder(
  input: Pick<OfflineOrderInput, 'lines' | 'address' | 'tipPercentage' | 'waivePlatformFee'>
): Promise<{ ok: true; preview: OfflinePreview } | ServiceFailure> {
  const prepared = await prepare(input);
  if (!prepared.ok) return prepared;
  const { built, orderItems } = prepared.value;
  const preview: OfflinePreview = {
    days: built.cart.days.map((day, i) => ({
      date: day.date,
      weekday: day.day,
      actualDeliveryDate: orderItems[i]?.actualDeliveryDate ? String(orderItems[i].actualDeliveryDate).slice(0, 10) : undefined,
      message: day.deliveryMessage?.message,
      dayTotal: day.dayTotal,
      items: day.items.map((it) => ({
        name: it.foodItem.name,
        quantity: it.quantity,
        unitPrice: it.price,
        lineTotal: it.totalPrice,
        portion: it.selectedPortion,
        spice: it.selectedSpiceLevel,
        eco: it.isEcoFriendlyContainer,
      })),
    })),
    totals: built.totals,
    minOrderValue: built.minOrderValue,
    canCheckout: true,
    belowMinimum: built.belowMinimum,
    deliveryMessages: built.deliveryMessages,
  };
  return { ok: true, preview };
}

const REQUESTS = 'offlineOrderRequests';

/** Reserves a request id. 'duplicate' when it was already used; a database problem is treated as "go on" (never block a sale). */
async function claimRequest(requestId: string, adminId: string): Promise<'claimed' | 'duplicate'> {
  try {
    const collection = await db.getCollectionForOperations(REQUESTS);
    await collection.insertOne({ _id: requestId as never, adminId, createdAt: new Date() });
    return 'claimed';
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) return 'duplicate';
    console.error('[offline-order] Could not reserve the request id', error instanceof Error ? error.message : error);
    return 'claimed';
  }
}

async function releaseRequest(requestId: string): Promise<void> {
  try {
    const collection = await db.getCollectionForOperations(REQUESTS);
    await collection.deleteOne({ _id: requestId as never });
  } catch {
    // the id stays used; the admin reloads the page for a new one
  }
}

async function completeRequest(requestId: string, orderId: string): Promise<void> {
  try {
    const collection = await db.getCollectionForOperations(REQUESTS);
    await collection.updateOne({ _id: requestId as never }, { $set: { orderId } });
  } catch {
    // only a note for support; the order itself is saved
  }
}

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-10-29.clover' });
}

export interface CreatedOfflineOrder {
  orderId: string;
  totalPaid: number;
  mode: 'link' | 'offline';
  accountCreated: boolean;
  payLink?: string;
  emailSent: boolean;
  emailError?: string;
}

/**
 * Creates the order. 'link' mode: the order waits for payment, a Stripe payment is opened for the exact
 * amount, and the customer gets an email with the pay link. 'offline' mode: the order is recorded as paid
 * outside the website (cash or similar) and the customer gets the usual order confirmation.
 */
export async function createOfflineOrder(
  input: OfflineOrderInput,
  context: { adminId: string; site?: string }
): Promise<{ ok: true; order: CreatedOfflineOrder } | ServiceFailure> {
  const { customer, payment } = input;

  const name = (customer?.name ?? '').trim();
  const email = normalizeEmail(customer?.email ?? '');
  if (name.length < 2) return fail(400, 'Enter the customer’s name');
  if (!EMAIL_RE.test(email)) return fail(400, 'Enter a valid email address for the customer');
  const phone = normalizePhone(customer?.phone ?? '');
  if (!phone) return fail(400, 'Phone number must be 10 digits');
  if (!input.address?.street_address || input.address.street_address.trim().length < 5) return fail(400, 'Enter the street address');
  if (!input.address.city || input.address.city.trim().length < 2) return fail(400, 'Enter the city');
  if (payment?.mode !== 'link' && payment?.mode !== 'offline') return fail(400, 'Choose how the customer pays');
  if (payment.mode === 'offline' && !normalizePaymentMethod(payment.method)) return fail(400, 'Choose how it was paid (Cash, Zelle, or type the method)');
  if (payment.mode === 'offline' && (payment.note ?? '').length > 200) return fail(400, 'The payment note is too long');

  if (typeof input.requestId !== 'string' || !/^[A-Za-z0-9-]{16,64}$/.test(input.requestId)) return fail(400, 'Missing request id. Reload the page and try again.');

  const prepared = await prepare(input);
  if (!prepared.ok) return prepared;
  const { built, orderItems } = prepared.value;

  const stripe = payment.mode === 'link' ? stripeClient() : null;
  if (payment.mode === 'link' && !stripe) return fail(500, 'Stripe is not configured on the site');

  // claim the request id: only the first request with it goes on (atomic: the id is the document's _id)
  const claim = await claimRequest(input.requestId, context.adminId);
  if (claim === 'duplicate') {
    return fail(409, 'This order was already submitted. Check the Orders list before creating it again.', { code: 'DUPLICATE_REQUEST' });
  }
  const released = () => releaseRequest(input.requestId);

  const ensured = await ensureCustomer({ name, email, phone }, input.address);
  if ('error' in ensured) {
    await released();
    return fail(400, ensured.error);
  }

  const orderId = generateOrderId();
  const { totals } = built;
  const base: Omit<Order, '_id'> = {
    orderId,
    user: ensured.userId,
    items: orderItems,
    address: createAddressSnapshot(built.cart.selectedAddress!),
    customerInfo: { name, email, phone },
    subtotal: totals.subtotal,
    platformFee: totals.platformFee,
    deliveryFee: totals.deliveryFee,
    taxes: totals.tax,
    tip: totals.tip,
    minOrderValue: built.minOrderValue,
    totalPaid: totals.total,
    currency: 'usd',
    status: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: 'Credit Card',
    deliveryMessages: built.deliveryMessages,
    source: 'admin',
    createdByAdmin: context.adminId,
    ...(input.waivePlatformFee ? { platformFeeWaived: true } : {}),
  };

  if (payment.mode === 'offline') {
    const paidOrder: Order = {
      ...base,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: normalizePaymentMethod(payment.method)!,
      offlinePaymentNote: payment.note?.trim() || undefined,
      paidAt: new Date(),
    } as Order;
    const saved = await db.create('orders', formatOrderForDatabase(paidOrder));
    if (!saved.success) {
      await released();
      return fail(500, 'Failed to save the order');
    }
    await completeRequest(input.requestId, orderId);
    let emailSent = false;
    let emailError: string | undefined;
    try {
      const sent = await sendOrderConfirmationEmail(paidOrder);
      emailSent = sent.success;
      emailError = sent.success ? undefined : sent.error;
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Email failed';
    }
    return { ok: true, order: { orderId, totalPaid: totals.total, mode: 'offline', accountCreated: ensured.accountCreated, emailSent, emailError } };
  }

  // pay link: open the Stripe payment first, so an order is never saved without a way to pay it
  const amountCents = Math.round(totals.total * 100);
  if (amountCents < 50) return fail(400, 'The total is below Stripe’s minimum of $0.50');
  const token = newPaymentToken();
  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe!.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: { ...buildOrderPaymentMetadata(base, context.site), kind: 'admin-order' },
      description: buildOrderDescription(base),
    });
  } catch (error) {
    console.error('[offline-order] Stripe error while opening the payment', { orderId, message: error instanceof Error ? error.message : String(error) });
    await released();
    return fail(500, 'Could not open the payment with Stripe. Nothing was saved.');
  }

  const pendingOrder: Order = {
    ...base,
    stripePaymentIntentId: paymentIntent.id,
    paymentLinkTokenHash: hashPaymentToken(token),
  } as Order;
  const saved = await db.create('orders', formatOrderForDatabase(pendingOrder));
  if (!saved.success) {
    await stripe!.paymentIntents.cancel(paymentIntent.id).catch(() => undefined);
    await released();
    return fail(500, 'Failed to save the order');
  }
  await completeRequest(input.requestId, orderId);

  const payLink = buildPayLink(orderId, token);
  const emailResult = await sendPaymentLinkEmail(pendingOrder, payLink, ensured.accountCreated);
  if (emailResult.success) {
    await db.updateOne('orders', { orderId } as never, { $set: { paymentLinkSentAt: new Date() } } as never);
    await recordPaymentLinkEmailSent(orderId, emailResult);
  }
  return {
    ok: true,
    order: {
      orderId,
      totalPaid: totals.total,
      mode: 'link',
      accountCreated: ensured.accountCreated,
      payLink,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    },
  };
}

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? new Date(d as string).toISOString() : undefined);

/** The latest pay-link email of an order, as the admin list shows it. */
function latestEmail(o: Order): OfflineOrderRow['linkEmail'] {
  const list = (o as unknown as { paymentLinkEmails?: PaymentLinkEmailRecord[] }).paymentLinkEmails;
  const e = list && list.length > 0 ? list[list.length - 1] : undefined;
  if (!e) return undefined;
  return {
    status: e.status,
    sentAt: iso(e.sentAt),
    ...(e.deliveredAt ? { deliveredAt: iso(e.deliveredAt) } : {}),
    ...(e.bounceReason ? { bounceReason: e.bounceReason } : {}),
    ...(e.firstOpenedAt && e.lastOpenedAt ? { opened: { firstAt: iso(e.firstOpenedAt)!, lastAt: iso(e.lastOpenedAt)!, count: e.openCount ?? 1 } } : {}),
  };
}

function viewsOf(o: Order): OfflineOrderRow['linkViews'] {
  const v = (o as unknown as { paymentLinkViews?: PaymentLinkViews }).paymentLinkViews;
  return v && v.count > 0 ? { firstAt: iso(v.firstAt)!, lastAt: iso(v.lastAt)!, count: v.count } : undefined;
}

export interface OfflineOrderRow {
  orderId: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  /** Paid by a payment link (as opposed to recorded as paid offline) */
  linkOrder: boolean;
  /** Still waiting for the customer to pay the link */
  awaitingPayment: boolean;
  linkSentAt?: string;
  /** What the email provider reported about the latest pay-link email */
  linkEmail?: { status: string; sentAt?: string; deliveredAt?: string; bounceReason?: string; opened?: { firstAt: string; lastAt: string; count: number } };
  /** When the customer's browser loaded the pay page (not email scanners) */
  linkViews?: { firstAt: string; lastAt: string; count: number };
  deliveryDates: string[];
  offlinePaymentNote?: string;
}

/**
 * The orders admins entered, newest first: the 40 most recent, plus EVERY link order still waiting for payment (however
 * old), so an unpaid order can never fall off the list.
 */
export async function listOfflineOrders(limit = 40): Promise<OfflineOrderRow[]> {
  const take = Math.min(Math.max(limit, 1), 100);
  const [recent, waiting] = await Promise.all([
    db.read<Order>('orders', { source: 'admin' } as never, { sort: { createdAt: -1 }, limit: take }),
    db.read<Order>(
      'orders',
      { source: 'admin', stripePaymentIntentId: { $exists: true }, paymentStatus: { $ne: 'paid' }, status: { $ne: 'cancelled' } } as never,
      { sort: { createdAt: -1 }, limit: 200 }
    ),
  ]);
  const byId = new Map<string, Order>();
  for (const o of [...(recent.success && recent.data ? recent.data : []), ...(waiting.success && waiting.data ? waiting.data : [])]) byId.set(o.orderId, o);
  const rows = [...byId.values()].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')) || (new Date(b.createdAt as never).getTime() - new Date(a.createdAt as never).getTime()));
  return rows.map((o) => ({
    orderId: o.orderId,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt ?? ''),
    customerName: o.customerInfo?.name ?? '',
    customerEmail: o.customerInfo?.email ?? '',
    total: o.totalPaid,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    linkOrder: Boolean(o.stripePaymentIntentId),
    awaitingPayment: Boolean(o.stripePaymentIntentId) && o.paymentStatus !== 'paid' && o.status !== 'cancelled',
    linkSentAt: o.paymentLinkSentAt ? (o.paymentLinkSentAt instanceof Date ? o.paymentLinkSentAt.toISOString() : String(o.paymentLinkSentAt)) : undefined,
    deliveryDates: Array.from(new Set((o.items ?? []).map((d) => String(d.actualDeliveryDate ?? d.deliveryDate).slice(0, 10)))).sort(),
    ...(latestEmail(o) ? { linkEmail: latestEmail(o) } : {}),
    ...(viewsOf(o) ? { linkViews: viewsOf(o) } : {}),
    offlinePaymentNote: o.offlinePaymentNote,
  }));
}

/**
 * Gives an unpaid link order a fresh pay link (the old one stops working). By default the new link is emailed to the
 * customer; with `sendEmail: false` it is only returned, so the admin can send it some other way.
 */
export async function resendPaymentLink(orderId: string, options: { sendEmail?: boolean } = {}): Promise<{ ok: true; payLink: string; emailSent: boolean; emailError?: string } | ServiceFailure> {
  const found = await db.readOne<Order>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order || order.source !== 'admin' || !order.stripePaymentIntentId) return fail(404, 'No pay-by-link order with that number');
  if (order.paymentStatus === 'paid') return fail(409, 'This order is already paid');
  if (order.status === 'cancelled') return fail(409, 'This order was cancelled');
  const token = newPaymentToken();
  await db.updateOne('orders', { orderId } as never, { $set: { paymentLinkTokenHash: hashPaymentToken(token), updatedAt: new Date() } } as never);
  const payLink = buildPayLink(orderId, token);
  if (options.sendEmail === false) return { ok: true, payLink, emailSent: false };
  const sent = await sendPaymentLinkEmail(order, payLink, false);
  if (sent.success) {
    await db.updateOne('orders', { orderId } as never, { $set: { paymentLinkSentAt: new Date() } } as never);
    await recordPaymentLinkEmailSent(orderId, sent);
  }
  return { ok: true, payLink, emailSent: sent.success, emailError: sent.error };
}

/** The customer paid outside the website after the link was sent: record it, close the Stripe payment, confirm by email. */
export async function markOfflinePaid(
  orderId: string,
  methodInput: string,
  note?: string
): Promise<{ ok: true; emailSent: boolean } | ServiceFailure> {
  const method = normalizePaymentMethod(methodInput);
  if (!method) return fail(400, 'Choose how it was paid (Cash, Zelle, or type the method)');
  const found = await db.readOne<Order>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order || order.source !== 'admin') return fail(404, 'No admin-entered order with that number');
  if (order.paymentStatus === 'paid') return fail(409, 'This order is already paid');
  if (order.status === 'cancelled') return fail(409, 'This order was cancelled');
  if ((note ?? '').length > 200) return fail(400, 'The payment note is too long');

  const stripe = stripeClient();
  if (order.stripePaymentIntentId && stripe) {
    try {
      const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      if (pi.status === 'succeeded' || pi.status === 'processing') return fail(409, 'The customer has already paid by card');
    } catch (error) {
      console.error('[offline-order] Could not check the Stripe payment', { orderId, message: error instanceof Error ? error.message : String(error) });
      return fail(502, 'Could not check the card payment with Stripe. Try again in a moment.');
    }
  }

  const update = await db.updateOne(
    'orders',
    { orderId, paymentStatus: { $ne: 'paid' } } as never,
    {
      $set: {
        paymentStatus: 'paid',
        status: 'confirmed',
        paymentMethod: method,
        ...(note?.trim() ? { offlinePaymentNote: note.trim() } : {}),
        paidAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { paymentLinkTokenHash: '' },
    } as never
  );
  if (!update.success) return fail(500, 'Failed to record the payment');

  // the order is marked paid first, so Stripe’s "canceled" event for the open payment is ignored
  if (order.stripePaymentIntentId && stripe) {
    await stripe.paymentIntents.cancel(order.stripePaymentIntentId).catch((error) => console.warn('[offline-order] Could not close the Stripe payment', { orderId, message: String(error) }));
  }

  let emailSent = false;
  try {
    const fresh = await db.readOne<Order>('orders', { orderId } as never);
    if (fresh.success && fresh.data) emailSent = (await sendOrderConfirmationEmail(fresh.data)).success;
  } catch (error) {
    console.error('[offline-order] Confirmation email failed', { orderId, message: String(error) });
  }
  return { ok: true, emailSent };
}

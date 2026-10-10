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
import { buildPayLink, hashPaymentToken, newPaymentToken, paymentTokenMatches } from '@/lib/server/paymentLink';
import { buildOrderDescription, buildOrderPaymentMetadata } from '@/lib/server/stripePaymentInfo';
import { validateZipcodeServiceabilityServer } from '@/utils/zipcodeValidation';
import { syncOrderSafely } from '@/lib/server/optimoRoute/sync';
import { calculateDeliveryDates } from '@/lib/deliveryCalculator';
import { convertCartToOrderItems, createAddressSnapshot, formatOrderForDatabase, generateOrderId } from '@/lib/orderHelpers';
import { sendPaymentLinkEmail, sendZelleInstructionsEmail } from '@/lib/offlineOrderEmail';
import { recordPaymentLinkEmailSent, type PaymentLinkEmailRecord, type PaymentLinkViews } from '@/lib/server/paymentLinkTracking';
import { sendOrderConfirmationEmail } from '@/lib/email';

const MAX_LINES = 60;

export type OfflinePayment =
  | { mode: 'link' }
  /** The customer pays by Zelle: the order waits unpaid and the customer gets the Zelle instructions by email (no Stripe) */
  | { mode: 'zelle' }
  | { mode: 'offline'; /** how it was paid: Cash, Zelle or any text the admin typed (stored as the order's payment method) */ method: string; note?: string };

export interface OfflineOrderInput {
  customer: CustomerInput;
  address: OfflineAddressInput;
  lines: OfflineLineInput[];
  tipPercentage: number;
  waivePlatformFee?: boolean;
  /** Dollars off the order (admin only) */
  discount?: number;
  allowBelowMinimum?: boolean;
  payment: OfflinePayment;
  /** One id per press of Create: a second request with the same id is refused, so a double tap or a retry cannot make the order twice */
  requestId: string;
  /** Editing: the unpaid link order this one replaces. When the new order is saved, the old one is cancelled and its link stops working. */
  replacesOrderId?: string;
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
  input: Pick<OfflineOrderInput, 'lines' | 'address' | 'tipPercentage' | 'waivePlatformFee' | 'discount'>
): Promise<{ ok: true; value: Prepared } | ServiceFailure> {
  const { lines, address, tipPercentage } = input;
  if (input.discount !== undefined && input.discount !== null && (!Number.isFinite(Number(input.discount)) || Number(input.discount) < 0 || Number(input.discount) > 10000)) {
    return fail(400, 'The discount must be a dollar amount from $0 to $10,000');
  }

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
    discount: input.discount,
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
    items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; portion?: string; spice?: string; eco?: boolean; /** menu price when the admin typed another one */ priceEditedFrom?: number }>;
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
  input: Pick<OfflineOrderInput, 'lines' | 'address' | 'tipPercentage' | 'waivePlatformFee' | 'discount'>
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
        ...(it.priceEditedFrom !== undefined ? { priceEditedFrom: it.priceEditedFrom } : {}),
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
  mode: 'link' | 'offline' | 'zelle';
  accountCreated: boolean;
  payLink?: string;
  emailSent: boolean;
  emailError?: string;
  /** Set when this order replaced another: whether the old one is now cancelled */
  replaced?: { orderId: string; cancelled: boolean; error?: string };
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
  const replaces = typeof input.replacesOrderId === 'string' ? input.replacesOrderId.trim() : '';
  if (!replaces) return createNewOfflineOrder(input, context);

  // editing: the order being replaced must still be waiting for payment, checked BEFORE anything new is made
  const old = await loadCancellableOrder(replaces);
  if (!old.ok) return old;
  const created = await createNewOfflineOrder(input, context);
  if (!created.ok) return created;
  // the new order exists; now close the old one (best effort: if the customer paid it meanwhile, say so)
  const closed = await cancelOfflineOrder(replaces);
  created.order.replaced = closed.ok ? { orderId: replaces, cancelled: true } : { orderId: replaces, cancelled: false, error: closed.error };
  return created;
}

async function createNewOfflineOrder(
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
  if (payment?.mode !== 'link' && payment?.mode !== 'offline' && payment?.mode !== 'zelle') return fail(400, 'Choose how the customer pays');
  if (payment.mode === 'offline' && !normalizePaymentMethod(payment.method)) return fail(400, 'Choose how it was paid (Cash, Zelle, or type the method)');
  if (payment.mode === 'offline' && (payment.note ?? '').length > 200) return fail(400, 'The payment note is too long');

  if (typeof input.requestId !== 'string' || !/^[A-Za-z0-9-]{16,64}$/.test(input.requestId)) return fail(400, 'Missing request id. Reload the page and try again.');

  // the Platform Fee only covers Stripe's card fee: a Zelle order has none unless the admin says otherwise
  if (payment.mode === 'zelle' && input.waivePlatformFee === undefined) input = { ...input, waivePlatformFee: true };
  const prepared = await prepare(input);
  if (!prepared.ok) return prepared;
  const { built, orderItems } = prepared.value;

  if (payment.mode === 'zelle' && !(built.totals.total > 0)) return fail(400, 'The total is $0.00, so there is nothing to pay by Zelle. Use “Already paid” instead.');
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
    ...(totals.discount > 0 ? { discount: { amount: totals.discount, code: 'ADMIN' } } : {}),
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
    // cash / paid-another-way orders are confirmed right now: put the delivery stop on the OptimoRoute plan
    await syncOrderSafely(orderId);
    return { ok: true, order: { orderId, totalPaid: totals.total, mode: 'offline', accountCreated: ensured.accountCreated, emailSent, emailError } };
  }

  if (payment.mode === 'zelle') {
    // Zelle: nothing goes through Stripe. The order waits unpaid until an admin marks it paid; the customer gets the instructions.
    const zelleOrder: Order = { ...base, paymentMethod: 'Zelle', zellePending: true } as Order;
    const savedZelle = await db.create('orders', formatOrderForDatabase(zelleOrder));
    if (!savedZelle.success) {
      await released();
      return fail(500, 'Failed to save the order');
    }
    await completeRequest(input.requestId, orderId);
    const zelleEmail = await sendZelleInstructionsEmail(zelleOrder, ensured.accountCreated);
    if (zelleEmail.success) {
      await db.updateOne('orders', { orderId } as never, { $set: { paymentLinkSentAt: new Date() } } as never);
      await recordPaymentLinkEmailSent(orderId, zelleEmail);
    }
    return { ok: true, order: { orderId, totalPaid: totals.total, mode: 'zelle', accountCreated: ensured.accountCreated, emailSent: zelleEmail.success, emailError: zelleEmail.error } };
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
    paymentLinkToken: token,
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
  /** As entered for the order (10 digits), so the admin can search the list by phone */
  customerPhone: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  /** Paid by a payment link (as opposed to recorded as paid offline) */
  linkOrder: boolean;
  /** link = card through a pay link, zelle = waits for a Zelle payment, offline = recorded as paid outside the website */
  payKind: 'link' | 'zelle' | 'offline';
  /** Still waiting for the customer to pay the link */
  awaitingPayment: boolean;
  linkSentAt?: string;
  /** What the email provider reported about the latest pay-link email */
  linkEmail?: { status: string; sentAt?: string; deliveredAt?: string; bounceReason?: string; opened?: { firstAt: string; lastAt: string; count: number } };
  /** When the customer's browser loaded the pay page (not email scanners) */
  linkViews?: { firstAt: string; lastAt: string; count: number };
  deliveryDates: string[];
  offlinePaymentNote?: string;
  /** What was ordered, for the expanded view of the admin list */
  details: OrderDetails;
}

export interface OrderDetailItem {
  name: string;
  quantity: number;
  /** Price of the line (price of one times quantity, eco container included) */
  lineTotal: number;
  /** Size, spice level and eco container */
  tags: string[];
  /** Combo picks, one line per section: 'Veg Curry of the Day: Kale Chane (12Oz)' */
  choices: string[];
  notes?: string;
}

export interface OrderDetailDay {
  /** The menu day the items were picked for, 'YYYY-MM-DD' */
  menuDay: string;
  /** The day they are delivered (differs when a day was combined into another) */
  deliveryDay: string;
  items: OrderDetailItem[];
  dayTotal: number;
}

export interface OrderDetails {
  days: OrderDetailDay[];
  totals: { subtotal: number; platformFee: number; deliveryFee: number; tax: number; tip: number; discount: number; total: number };
  /** The delivery address on one line, with the gate code and the delivery instruction when there are any */
  address: { line: string; gateCode?: string; instruction?: string };
}

const dayString = (value: unknown): string => String(value instanceof Date ? value.toISOString() : value ?? '').slice(0, 10);

/** The combo picks of an order item, one line per section ('Title: Name (size), Name (size)'). */
function comboChoiceLines(item: OrderDay['items'][number]): string[] {
  const picks = item.comboSelections ?? {};
  const sections = ((item.food as unknown as { sections?: Array<{ _id?: string; title?: string; selectedItems?: Array<{ _id?: string; portion?: string; item?: { name?: string } }> }> }).sections ?? []);
  const lines: string[] = [];
  for (const section of sections) {
    const names = ((section._id && picks[section._id]) || [])
      .map((id) => section.selectedItems?.find((s) => s._id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => `${s.item?.name ?? 'Item'}${s.portion ? ` (${s.portion})` : ''}`);
    if (names.length > 0) lines.push(`${section.title ?? 'Choice'}: ${names.join(', ')}`);
  }
  return lines;
}

/** Everything an admin wants to see when they open an order in the list: the items by day, the totals and where it goes. */
export function describeOrder(o: Order): OrderDetails {
  const days: OrderDetailDay[] = (o.items ?? []).map((day) => ({
    menuDay: dayString(day.deliveryDate),
    deliveryDay: dayString(day.actualDeliveryDate ?? day.deliveryDate),
    items: (day.items ?? []).map((item) => {
      const tags: string[] = [];
      if (item.selectedPortion) tags.push(item.selectedPortion);
      if (item.spiceLevel) tags.push(item.spiceLevel);
      if (item.isEcoFriendlyContainer) tags.push('Eco');
      return {
        name: item.food?.name ?? 'Item',
        quantity: item.quantity,
        lineTotal: Math.round(item.price * item.quantity * 100) / 100,
        tags,
        choices: comboChoiceLines(item),
        ...(item.notes ? { notes: item.notes } : {}),
      };
    }),
    dayTotal: day.dayTotal,
  }));
  const a = o.address;
  const line = a ? [a.street, a.apartment, [a.city, a.zipCode].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '';
  return {
    days,
    totals: {
      subtotal: o.subtotal ?? 0,
      platformFee: o.platformFee ?? 0,
      deliveryFee: o.deliveryFee ?? 0,
      tax: o.taxes ?? 0,
      tip: o.tip ?? 0,
      discount: o.discount?.amount ?? 0,
      total: o.totalPaid ?? 0,
    },
    address: { line, ...(a?.entrance ? { gateCode: a.entrance } : {}), ...(a?.floor ? { instruction: a.floor } : {}) },
  };
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
      { source: 'admin', $or: [{ stripePaymentIntentId: { $exists: true } }, { zellePending: true }], paymentStatus: { $ne: 'paid' }, status: { $ne: 'cancelled' } } as never,
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
    customerPhone: o.customerInfo?.phone ?? '',
    total: o.totalPaid,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    linkOrder: Boolean(o.stripePaymentIntentId),
    payKind: o.zellePending ? 'zelle' : o.stripePaymentIntentId ? 'link' : 'offline',
    awaitingPayment: (Boolean(o.stripePaymentIntentId) || Boolean(o.zellePending)) && o.paymentStatus !== 'paid' && o.status !== 'cancelled',
    linkSentAt: o.paymentLinkSentAt ? (o.paymentLinkSentAt instanceof Date ? o.paymentLinkSentAt.toISOString() : String(o.paymentLinkSentAt)) : undefined,
    deliveryDates: Array.from(new Set((o.items ?? []).map((d) => String(d.actualDeliveryDate ?? d.deliveryDate).slice(0, 10)))).sort(),
    ...(latestEmail(o) ? { linkEmail: latestEmail(o) } : {}),
    ...(viewsOf(o) ? { linkViews: viewsOf(o) } : {}),
    offlinePaymentNote: o.offlinePaymentNote,
    details: describeOrder(o),
  }));
}

/** An admin-entered link order that is still waiting for payment (the only kind that can be cancelled or edited here). */
async function loadCancellableOrder(orderId: string): Promise<{ ok: true; order: Order } | ServiceFailure> {
  const found = await db.readOne<Order>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order || order.source !== 'admin') return fail(404, 'No admin-entered order with that number');
  if (order.paymentStatus === 'paid') return fail(409, 'This order is already paid. Refunds are done in Stripe.');
  if (order.status === 'cancelled') return fail(409, 'This order was already cancelled');
  if (!order.stripePaymentIntentId && !order.zellePending) return fail(409, 'Only an order waiting for payment can be cancelled or edited here');
  return { ok: true, order };
}

/** Cancels an unpaid link order: the Stripe payment is closed first (Stripe refuses if the customer already paid), then the order. */
export async function cancelOfflineOrder(orderId: string, adminId?: string): Promise<{ ok: true } | ServiceFailure> {
  const loaded = await loadCancellableOrder(orderId);
  if (!loaded.ok) return loaded;
  const order = loaded.order;

  const stripe = order.stripePaymentIntentId ? stripeClient() : null;
  if (order.stripePaymentIntentId && !stripe) return fail(500, 'Stripe is not configured on the site');
  if (order.stripePaymentIntentId && stripe) try {
    const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (pi.status === 'succeeded' || pi.status === 'processing') return fail(409, 'The customer has already paid by card, so it cannot be cancelled. Refunds are done in Stripe.');
    if (pi.status !== 'canceled') {
      try {
        await stripe.paymentIntents.cancel(pi.id);
      } catch (error) {
        const again = await stripe.paymentIntents.retrieve(pi.id).catch(() => null);
        if (again?.status === 'succeeded' || again?.status === 'processing') return fail(409, 'The customer just paid by card, so it cannot be cancelled. Refunds are done in Stripe.');
        if (again?.status !== 'canceled') throw error;
      }
    }
  } catch (error) {
    console.error('[offline-order] Could not close the Stripe payment', { orderId, message: error instanceof Error ? error.message : String(error) });
    return fail(502, 'Could not close the card payment with Stripe. Nothing was cancelled. Try again in a moment.');
  }

  const update = await db.updateOne(
    'orders',
    { orderId, paymentStatus: { $ne: 'paid' } } as never,
    {
      $set: { status: 'cancelled', cancelledAt: new Date(), ...(adminId ? { cancelledByAdmin: adminId } : {}), updatedAt: new Date() },
      $unset: { paymentLinkTokenHash: '', paymentLinkToken: '' },
    } as never
  );
  if (!update.success) return fail(500, 'The payment was closed but the order could not be updated. Try again.');
  return { ok: true };
}

export interface EditableOrder {
  orderId: string;
  customer: { name: string; email: string; phone: string };
  address: { street_address: string; apartment: string; city: string; postal_code: string; entrance: string; floor: string };
  lines: Array<{
    date: string;
    foodItemId: string;
    quantity: number;
    selectedPortion?: string;
    selectedSpiceLevel?: string;
    isEcoFriendlyContainer?: boolean;
    comboSelections?: Record<string, string[]>;
    notes?: string;
    /** The price typed for one item (the order keeps it when it is edited again) */
    unitPriceEdited?: number;
    name: string;
    unitPrice: number;
    tags: string[];
  }>;
  tipPercentage: number;
  waivePlatformFee: boolean;
  /** Dollars off */
  discount: number;
  /** How the order is paid, so the replacement starts on the same choice */
  payKind: 'link' | 'zelle';
}

/** The order laid out the way the Create Order form holds it, so an admin can change it and submit it as a replacement. */
export async function getOrderForEdit(orderId: string): Promise<{ ok: true; order: EditableOrder } | ServiceFailure> {
  const loaded = await loadCancellableOrder(orderId);
  if (!loaded.ok) return loaded;
  const o = loaded.order;
  const lines: EditableOrder['lines'] = [];
  for (const day of o.items ?? []) {
    const date = String(day.deliveryDate instanceof Date ? day.deliveryDate.toISOString() : day.deliveryDate).slice(0, 10);
    for (const item of day.items ?? []) {
      const picks = item.comboSelections ?? {};
      const tags: string[] = [];
      if (item.selectedPortion) tags.push(item.selectedPortion);
      if (item.spiceLevel) tags.push(item.spiceLevel);
      if (item.isEcoFriendlyContainer) tags.push('Eco container');
      for (const section of ((item.food as unknown as { sections?: Array<{ _id?: string; title?: string; selectedItems?: Array<{ _id?: string; portion?: string; item?: { name?: string } }> }> }).sections ?? [])) {
        const names = ((section._id && picks[section._id]) || [])
          .map((id) => section.selectedItems?.find((s) => s._id === id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
          .map((s) => `${s.item?.name ?? 'Item'}${s.portion ? ` (${s.portion})` : ''}`);
        if (names.length > 0) tags.push(`${section.title ?? 'Choice'}: ${names.join(', ')}`);
      }
      lines.push({
        date,
        foodItemId: String(item.food._id),
        quantity: item.quantity,
        ...(item.selectedPortion ? { selectedPortion: item.selectedPortion } : {}),
        ...(item.spiceLevel ? { selectedSpiceLevel: item.spiceLevel } : {}),
        ...(item.isEcoFriendlyContainer ? { isEcoFriendlyContainer: true } : {}),
        ...(item.comboSelections && Object.keys(item.comboSelections).length > 0 ? { comboSelections: item.comboSelections } : {}),
        ...(item.notes ? { notes: item.notes } : {}),
        ...(item.priceEditedFrom !== undefined ? { unitPriceEdited: Math.round((item.price - (item.isEcoFriendlyContainer ? item.ecoContainerCharge ?? 0 : 0)) * 100) / 100 } : {}),
        name: item.food.name,
        unitPrice: item.price,
        tags,
      });
    }
  }
  const payable = Math.max(0, (o.subtotal ?? 0) - (o.discount?.amount ?? 0));
  const pct = payable > 0 ? (o.tip / payable) * 100 : 0;
  const tipPercentage = TIP_PERCENTAGES.reduce((best, p) => (Math.abs(p - pct) < Math.abs(best - pct) ? p : best), 0 as number);
  return {
    ok: true,
    order: {
      orderId: o.orderId,
      customer: { name: o.customerInfo?.name ?? '', email: o.customerInfo?.email ?? '', phone: o.customerInfo?.phone ?? '' },
      address: {
        street_address: o.address?.street ?? '',
        apartment: o.address?.apartment ?? '',
        city: o.address?.city ?? '',
        postal_code: o.address?.zipCode ?? '',
        entrance: o.address?.entrance ?? '',
        floor: o.address?.floor ?? '',
      },
      lines,
      tipPercentage,
      waivePlatformFee: Boolean((o as unknown as { platformFeeWaived?: boolean }).platformFeeWaived),
      discount: o.discount?.amount ?? 0,
      payKind: o.zellePending ? 'zelle' : 'link',
    },
  };
}

/** A reminder or a second copy of the same link may not be sent more than once in this time (stops double clicks). */
export const REMINDER_COOLDOWN_MS = 30_000;

/**
 * Gives an unpaid link order a pay link and (by default) emails it.
 * `keepCurrent: false` (default): a fresh link, the old one stops working.
 * `keepCurrent: true`: the SAME link as before (used for reminders and for copying the current link). Orders made before the
 * link itself was saved have no copy to give back: they are refused (409, code LINK_NOT_SAVED) unless `allowRefresh` is true,
 * which makes a fresh link (the one the customer already has stops working) and says so with `refreshed: true`.
 */
export async function resendPaymentLink(
  orderId: string,
  options: { sendEmail?: boolean; keepCurrent?: boolean; allowRefresh?: boolean; now?: Date } = {}
): Promise<{ ok: true; payLink: string; emailSent: boolean; emailError?: string; refreshed: boolean } | ServiceFailure> {
  const now = options.now ?? new Date();
  const found = await db.readOne<Order>('orders', { orderId } as never);
  const order = found.success ? found.data : null;
  if (!order || order.source !== 'admin' || (!order.stripePaymentIntentId && !order.zellePending)) return fail(404, 'No order waiting for payment with that number');
  if (order.paymentStatus === 'paid') return fail(409, 'This order is already paid');
  if (order.status === 'cancelled') return fail(409, 'This order was cancelled');

  // Zelle order: there is no link; "send" means emailing the Zelle instructions again (once every few seconds at most)
  if (order.zellePending) {
    if (options.sendEmail === false) return fail(409, 'A Zelle order has no payment link to copy');
    if (order.paymentLinkSentAt) {
      const last = new Date(order.paymentLinkSentAt as unknown as string | Date).getTime();
      if (Number.isFinite(last) && now.getTime() - last < REMINDER_COOLDOWN_MS) return fail(409, 'The instructions were just emailed. Wait a few seconds before sending them again.');
    }
    const sentZelle = await sendZelleInstructionsEmail(order, false);
    if (sentZelle.success) {
      await db.updateOne('orders', { orderId } as never, { $set: { paymentLinkSentAt: now } } as never);
      await recordPaymentLinkEmailSent(orderId, sentZelle);
    }
    return { ok: true, payLink: '', emailSent: sentZelle.success, emailError: sentZelle.error, refreshed: false };
  }

  const sending = options.sendEmail !== false;
  if (sending && options.keepCurrent && order.paymentLinkSentAt) {
    const last = new Date(order.paymentLinkSentAt as unknown as string | Date).getTime();
    if (Number.isFinite(last) && now.getTime() - last < REMINDER_COOLDOWN_MS) return fail(409, 'The link was just emailed. Wait a few seconds before sending it again.');
  }

  let token = options.keepCurrent && order.paymentLinkToken && paymentTokenMatches(order.paymentLinkToken, order.paymentLinkTokenHash) ? order.paymentLinkToken : '';
  const refreshed = !token;
  if (!token && options.keepCurrent && !options.allowRefresh) {
    return fail(409, 'The current link was not saved for this order, so it cannot be copied or re-sent. A fresh link can be made, but the link the customer already has will stop working.', { code: 'LINK_NOT_SAVED' });
  }
  if (!token) {
    token = newPaymentToken();
    await db.updateOne('orders', { orderId } as never, { $set: { paymentLinkTokenHash: hashPaymentToken(token), paymentLinkToken: token, updatedAt: now } } as never);
  }
  const payLink = buildPayLink(orderId, token);
  if (!sending) return { ok: true, payLink, emailSent: false, refreshed };
  const sent = await sendPaymentLinkEmail(order, payLink, false);
  if (sent.success) {
    await db.updateOne('orders', { orderId } as never, { $set: { paymentLinkSentAt: now } } as never);
    await recordPaymentLinkEmailSent(orderId, sent);
  }
  return { ok: true, payLink, emailSent: sent.success, emailError: sent.error, refreshed };
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
      $unset: { paymentLinkTokenHash: '', paymentLinkToken: '', zellePending: '' },
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
  await syncOrderSafely(orderId);
  return { ok: true, emailSent };
}

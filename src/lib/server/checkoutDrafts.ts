import type Stripe from 'stripe';
import { db } from '@/lib/server/db';
import type { Cart, CartItem } from '@/types/cart';

/**
 * Checkout drafts: one record per payment the site prepared when someone opened checkout (`checkoutDrafts`).
 * It remembers who they are and what was in the cart, so people who never finished paying can be contacted from the
 * admin (and later by an automated email). Writing it is best-effort: it must never slow down or break a payment.
 *
 *   open        the payment is not completed (the customer may or may not have pressed Pay)
 *   converted   this payment succeeded
 *   superseded  the same customer paid for something else later (another payment of theirs succeeded), so this one is
 *               no longer a lead. Customers who change their cart get a new payment each time, so leftovers are common.
 */

const COLLECTION = 'checkoutDrafts';
const RETENTION_DAYS = 60;
const SAVE_TIMEOUT_MS = 2000;

export interface DraftItem {
  date: string;
  day?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  portion?: string;
  spice?: string;
  eco?: boolean;
  /** Combo choices by section, e.g. "Curry of the Day: Rajma (12Oz)" */
  choices?: string[];
  note?: string;
}

export interface DraftCustomer {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CheckoutDraft {
  paymentIntentId: string;
  userId: string;
  customer: DraftCustomer;
  items: DraftItem[];
  itemCount: number;
  total: number;
  deliveryDates: string[];
  zip?: string;
  status: 'open' | 'converted' | 'superseded';
  /** Set when the customer pressed Pay (an order row exists), whether or not the payment worked */
  orderId?: string;
  source: 'checkout' | 'stripe-backfill';
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  convertedAt?: Date;
  /** The payment of this customer that succeeded after this draft was left behind */
  supersededBy?: string;
  /** Filled by the admin when someone has reached out */
  contacted?: { at: Date; by?: string; note?: string };
  dismissedAt?: Date;
  /** For the automated reminder email to come: when one was sent */
  reminderEmailSentAt?: Date;
  expiresAt: Date;
}

const money = (n: unknown) => Math.round((Number(n) || 0) * 100 + 1e-9) / 100;

/** Names of the combo choices of a line ("Curry of the Day: Rajma (12Oz)"). Defensive: the food item snapshot varies. */
function comboChoices(item: CartItem): string[] {
  const picks = item.comboSelections ?? {};
  const sections = ((item.foodItem as unknown as { sections?: Array<Record<string, unknown>> })?.sections ?? []) as Array<{
    _id?: string;
    title?: string;
    selectedItems?: Array<{ _id?: string; portion?: string; item?: { name?: string } }>;
  }>;
  const out: string[] = [];
  for (const section of sections) {
    const ids = (section._id && picks[section._id]) || [];
    const names = ids
      .map((id) => section.selectedItems?.find((o) => o._id === id))
      .filter((o): o is NonNullable<typeof o> => Boolean(o))
      .map((o) => `${o.item?.name ?? 'Item'}${o.portion ? ` (${o.portion})` : ''}`);
    if (names.length > 0) out.push(`${section.title ?? 'Choice'}: ${names.join(', ')}`);
  }
  return out;
}

/** The cart as the list of lines to show in the admin (what the customer wanted). */
export function buildDraftItems(cart: Cart): DraftItem[] {
  const items: DraftItem[] = [];
  for (const day of cart.days ?? []) {
    for (const item of day.items ?? []) {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const unitPrice = money(item.price);
      const choices = comboChoices(item);
      items.push({
        date: String(item.date || day.date || '').slice(0, 10),
        day: item.day || day.day,
        name: String(item.foodItem?.name ?? 'Item').slice(0, 120),
        quantity,
        unitPrice,
        lineTotal: money(item.totalPrice ?? unitPrice * quantity),
        ...(item.selectedPortion ? { portion: String(item.selectedPortion) } : {}),
        ...(item.selectedSpiceLevel ? { spice: String(item.selectedSpiceLevel) } : {}),
        ...(item.isEcoFriendlyContainer ? { eco: true } : {}),
        ...(choices.length > 0 ? { choices } : {}),
        ...(item.notes ? { note: String(item.notes).slice(0, 200) } : {}),
      });
    }
  }
  return items;
}

let indexesReady: Promise<void> | null = null;
/** One unique index on the payment id, and the automatic deletion of old records. Created once per process, never fatal. */
function ensureIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = (async () => {
      try {
        const collection = await db.getCollectionForOperations(COLLECTION);
        await collection.createIndex({ paymentIntentId: 1 }, { unique: true });
        await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await collection.createIndex({ status: 1, lastActivityAt: -1 });
      } catch (error) {
        console.warn('[checkout-drafts] could not create indexes', error instanceof Error ? error.message : error);
        indexesReady = null;
      }
    })();
  }
  return indexesReady;
}

function expiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + RETENTION_DAYS * 24 * 3600 * 1000);
}

/** Runs a save with a time limit and swallows every error: a payment never waits on, or fails because of, this. */
async function bestEffort(label: string, work: () => Promise<void>): Promise<void> {
  try {
    await Promise.race([
      work(),
      new Promise<void>((resolve) => setTimeout(resolve, SAVE_TIMEOUT_MS)),
    ]);
  } catch (error) {
    console.warn(`[checkout-drafts] ${label} failed`, error instanceof Error ? error.message : error);
  }
}

/** Creates or refreshes the draft of this payment (called whenever checkout prepares or updates it). */
export async function saveCheckoutDraft(input: {
  paymentIntentId: string;
  userId: string;
  customer: DraftCustomer;
  cart: Cart;
  total: number;
}): Promise<void> {
  await bestEffort('save', async () => {
    await ensureIndexes();
    const now = new Date();
    const items = buildDraftItems(input.cart);
    const collection = await db.getCollectionForOperations(COLLECTION);
    await collection.updateOne(
      { paymentIntentId: input.paymentIntentId, status: { $ne: 'converted' } },
      {
        $set: {
          userId: input.userId,
          customer: input.customer,
          items,
          itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
          total: money(input.total),
          deliveryDates: [...new Set(items.map((i) => i.date))].sort(),
          zip: input.cart.selectedAddress?.zipCode,
          updatedAt: now,
          lastActivityAt: now,
          expiresAt: expiry(now),
        },
        $setOnInsert: { paymentIntentId: input.paymentIntentId, status: 'open', source: 'checkout', createdAt: now },
      },
      { upsert: true }
    ).catch((error: { code?: number }) => {
      // a converted draft with this payment id already exists: nothing to refresh
      if (error?.code !== 11000) throw error;
    });
  });
}

/** The customer pressed Pay: remember which order belongs to the payment. */
export async function attachOrderToDraft(paymentIntentId: string, orderId: string): Promise<void> {
  await bestEffort('attach order', async () => {
    const collection = await db.getCollectionForOperations(COLLECTION);
    await collection.updateOne({ paymentIntentId }, { $set: { orderId, updatedAt: new Date() } });
  });
}

/**
 * The payment went through: this draft is no longer a lead, and neither is any other open draft the same customer left
 * behind before paying (they changed the cart, which made a new payment, then paid with that one).
 */
export async function markDraftConverted(paymentIntentId: string, userIdHint?: string): Promise<void> {
  await bestEffort('mark converted', async () => {
    const collection = await db.getCollectionForOperations(COLLECTION);
    const now = new Date();
    const mine = await collection.findOneAndUpdate(
      { paymentIntentId },
      { $set: { status: 'converted', convertedAt: now, updatedAt: now } },
      { returnDocument: 'after' }
    );
    const userId = (mine as { userId?: string } | null)?.userId ?? userIdHint;
    if (userId) {
      await collection.updateMany(
        { userId, status: 'open', paymentIntentId: { $ne: paymentIntentId }, createdAt: { $lte: now } },
        { $set: { status: 'superseded', supersededBy: paymentIntentId, updatedAt: now } }
      );
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Backfill from Stripe (the drafts that existed before this record was kept: contact and totals only, no items)

export interface BackfillResult {
  scanned: number;
  inserted: number;
  alreadyThere: number;
  skipped: number;
}

/**
 * Creates drafts for the open checkout payments Stripe already holds. Existing drafts are left exactly as they are
 * (so it is safe to run again). The contact comes from the customer's account (the user id on the payment), falling back
 * to what was saved on the payment.
 */
export async function backfillDraftsFromStripe(stripe: Stripe, sinceDays: number): Promise<BackfillResult> {
  const result: BackfillResult = { scanned: 0, inserted: 0, alreadyThere: 0, skipped: 0 };
  await ensureIndexes();
  const collection = await db.getCollectionForOperations(COLLECTION);
  const since = Math.floor(Date.now() / 1000) - Math.max(1, Math.min(sinceDays, 60)) * 86400;

  let page: string | undefined;
  for (let i = 0; i < 20; i++) {
    const found = await stripe.paymentIntents.search({
      query: `status:'requires_payment_method' AND metadata['checkoutDraft']:'true' AND created>${since}`,
      limit: 100,
      ...(page ? { page } : {}),
    });
    for (const pi of found.data) {
      result.scanned += 1;
      const meta = pi.metadata ?? {};
      if (!meta.userId) {
        result.skipped += 1;
        continue;
      }
      let name: string | undefined;
      let email = meta.customerEmail || undefined;
      let phone = meta.customerPhone || undefined;
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(meta.userId)) {
          const user = await db.readOne<{ name?: string; email?: string; phone?: string }>('users', { _id: new ObjectId(meta.userId) } as never);
          if (user.success && user.data) {
            name = user.data.name || undefined;
            email = email || user.data.email || undefined;
            phone = phone || user.data.phone || undefined;
          }
        }
      } catch {
        // the contact from the payment is still enough
      }
      const created = new Date(pi.created * 1000);
      const update = await collection.updateOne(
        { paymentIntentId: pi.id },
        {
          $setOnInsert: {
            paymentIntentId: pi.id,
            userId: meta.userId,
            customer: { ...(name ? { name } : {}), ...(email ? { email } : {}), ...(phone ? { phone } : {}) },
            items: [],
            itemCount: Number(meta.itemCount) || 0,
            total: money(meta.cartTotal ?? pi.amount / 100),
            deliveryDates: (meta.deliveryDates ?? '').split(',').filter(Boolean),
            ...(meta.zip ? { zip: meta.zip } : {}),
            status: 'open',
            ...(meta.orderId ? { orderId: meta.orderId } : {}),
            source: 'stripe-backfill',
            createdAt: created,
            updatedAt: created,
            lastActivityAt: created,
            expiresAt: expiry(created),
          },
        },
        { upsert: true }
      );
      if (update.upsertedCount > 0) result.inserted += 1;
      else result.alreadyThere += 1;
    }
    if (!found.has_more || !found.next_page) break;
    page = found.next_page;
  }
  return result;
}

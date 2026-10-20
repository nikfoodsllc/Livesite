import { db } from '@/lib/server/db';

/** What a synced cart looks like on the server: the same shape the browser and the app keep (days -> lines). */
export interface SyncedCart {
  days: Record<string, { day?: string; date?: string; items: Record<string, unknown> }>;
  version?: string;
  lastUpdated?: string;
}

export interface UserCartDoc {
  userId: string;
  /** null: the cart was emptied (by an order or by the customer) */
  cart: SyncedCart | null;
  /** grows with every change; a device compares it with the one it last saw */
  rev: number;
  updatedAt: Date;
  source?: string;
}

const MAX_CHARS = 400_000;
const MAX_DAYS = 14;
const MAX_LINES = 150;

/** Is this something we are willing to store as a cart? (A cart is always the customer's own, so this is about size and shape.) */
export function validateCart(cart: unknown): { ok: true; cart: SyncedCart | null } | { ok: false; error: string } {
  if (cart === null) return { ok: true, cart: null };
  if (typeof cart !== 'object' || Array.isArray(cart)) return { ok: false, error: 'Invalid cart' };
  const days = (cart as { days?: unknown }).days;
  if (!days || typeof days !== 'object' || Array.isArray(days)) return { ok: false, error: 'Invalid cart' };
  const entries = Object.entries(days as Record<string, unknown>);
  if (entries.length > MAX_DAYS) return { ok: false, error: 'Too many days in the cart' };
  let lines = 0;
  for (const [, day] of entries) {
    const items = (day as { items?: unknown } | null)?.items;
    if (!items || typeof items !== 'object' || Array.isArray(items)) return { ok: false, error: 'Invalid cart' };
    lines += Object.keys(items as object).length;
  }
  if (lines > MAX_LINES) return { ok: false, error: 'Too many items in the cart' };
  if (JSON.stringify(cart).length > MAX_CHARS) return { ok: false, error: 'The cart is too large' };
  return { ok: true, cart: cart as SyncedCart };
}

/** A cart with no lines at all counts as empty. */
export function isEmptyCart(cart: SyncedCart | null | undefined): boolean {
  if (!cart || !cart.days) return true;
  return Object.values(cart.days).every((d) => !d || !d.items || Object.keys(d.items).length === 0);
}

async function collection() {
  const col = await db.getCollectionForOperations<Record<string, unknown>>('userCarts');
  await col.createIndex({ userId: 1 }, { unique: true }).catch(() => undefined);
  return col;
}

export async function getUserCart(userId: string): Promise<UserCartDoc | null> {
  const col = await collection();
  return (await col.findOne({ userId } as never)) as unknown as UserCartDoc | null;
}

/** Saves the customer's cart (null empties it). Always bumps rev. */
export async function putUserCart(userId: string, cart: SyncedCart | null, source: string): Promise<UserCartDoc> {
  const col = await collection();
  const prev = (await col.findOne({ userId } as never, { projection: { rev: 1 } })) as { rev?: number } | null;
  const rev = Math.max(Date.now(), (prev?.rev ?? 0) + 1);
  const doc: UserCartDoc = { userId, cart: isEmptyCart(cart) ? null : cart, rev, updatedAt: new Date(), source };
  await col.updateOne({ userId } as never, { $set: doc as never }, { upsert: true });
  return doc;
}

/** The customer ordered (paid): the saved cart is empty on every device. Never throws. */
export async function clearUserCartSafely(userId: string | undefined | null, source = 'order'): Promise<void> {
  if (!userId) return;
  try {
    const existing = await getUserCart(String(userId));
    if (!existing || existing.cart === null) return;
    await putUserCart(String(userId), null, source);
  } catch (error) {
    console.error('[cart] could not clear the saved cart', error instanceof Error ? error.message : error);
  }
}

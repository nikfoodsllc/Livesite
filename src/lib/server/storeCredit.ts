import { db } from '@/lib/server/db';
import { toDollars, type CreditLedgerType } from '@/lib/storeCredit';

/**
 * Store credit in the database.
 *
 * `storeCreditAccounts` holds one document per customer with the balance in whole cents. Every change to the balance is ONE
 * atomic update on that document (a spend only succeeds while the balance covers it), so two checkouts at the same moment can
 * never spend the same credit twice. `storeCreditLedger` is the audit trail: one row per change, with who and why.
 *
 * Credit that pays for an order is taken off the balance when the order is created (held), so it cannot be used twice while
 * the card payment is still open. It is given back when the order is cancelled or deleted, when the card payment is
 * cancelled, or when a fully refunded order is cancelled.
 */
const ACCOUNTS = 'storeCreditAccounts';
const LEDGER = 'storeCreditLedger';

export interface LedgerRow {
  userId: string;
  /** Signed cents: + adds to the balance, - spends from it */
  cents: number;
  type: CreditLedgerType;
  orderId?: string;
  reason?: string;
  /** Only admins see this: why the credit was given (the customer's own note is `reason`) */
  internalNote?: string;
  /** Admin who issued or adjusted it */
  by?: string;
  /** Items the credit was issued for */
  items?: Array<{ line: number; item: number; name: string; quantity: number; cents: number }>;
  balanceAfterCents?: number;
  at: Date;
}

let indexReady: Promise<void> | null = null;
async function ensureIndex(): Promise<void> {
  if (!indexReady) {
    indexReady = (async () => {
      try {
        const accounts = await db.getCollectionForOperations(ACCOUNTS);
        await accounts.createIndex({ userId: 1 }, { unique: true });
        const ledger = await db.getCollectionForOperations(LEDGER);
        await ledger.createIndex({ userId: 1, at: -1 });
      } catch (error) {
        indexReady = null;
        console.warn('[store-credit] could not create indexes', error instanceof Error ? error.message : error);
      }
    })();
  }
  await indexReady;
}

interface AccountDoc {
  userId: string;
  balanceCents: number;
}

export async function getBalanceCents(userId: string): Promise<number> {
  if (!userId) return 0;
  const account = await db.readOne<AccountDoc>(ACCOUNTS, { userId } as never);
  return Math.max(0, Math.round(account.success ? account.data?.balanceCents ?? 0 : 0));
}

async function writeLedger(row: LedgerRow): Promise<void> {
  const result = await db.create(LEDGER, row as never);
  if (!result.success) console.error('[store-credit] could not write the ledger row', { userId: row.userId, type: row.type, error: result.error });
}

/** Adds credit (issued for items, or a manual adjustment). Returns the new balance in cents. */
export async function addCredit(input: {
  userId: string;
  cents: number;
  type: 'issued' | 'adjusted' | 'restored';
  orderId?: string;
  reason?: string;
  internalNote?: string;
  by?: string;
  items?: LedgerRow['items'];
}): Promise<number> {
  await ensureIndex();
  const cents = Math.round(input.cents);
  if (!(cents > 0)) throw new Error('Credit must be more than zero');
  const accounts = await db.getCollectionForOperations<AccountDoc>(ACCOUNTS);
  const updated = await accounts.findOneAndUpdate(
    { userId: input.userId },
    { $inc: { balanceCents: cents }, $set: { updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } } as never,
    { upsert: true, returnDocument: 'after' }
  );
  const balanceAfterCents = Math.round(updated?.balanceCents ?? cents);
  await writeLedger({ userId: input.userId, cents, type: input.type, orderId: input.orderId, reason: input.reason, ...(input.internalNote ? { internalNote: input.internalNote } : {}), by: input.by, items: input.items, balanceAfterCents, at: new Date() });
  return balanceAfterCents;
}

/**
 * Takes credit off the balance, but only while the balance covers it. Returns false when it does not (nothing changes).
 * `by` is set for a manual removal by an admin.
 */
export async function spendCredit(input: { userId: string; cents: number; orderId?: string; reason?: string; by?: string; type?: 'used' | 'adjusted' }): Promise<boolean> {
  await ensureIndex();
  const cents = Math.round(input.cents);
  if (!(cents > 0)) return true;
  const accounts = await db.getCollectionForOperations<AccountDoc>(ACCOUNTS);
  const updated = await accounts.findOneAndUpdate(
    { userId: input.userId, balanceCents: { $gte: cents } },
    { $inc: { balanceCents: -cents }, $set: { updatedAt: new Date() } } as never,
    { returnDocument: 'after' }
  );
  if (!updated) return false;
  await writeLedger({ userId: input.userId, cents: -cents, type: input.type ?? 'used', orderId: input.orderId, reason: input.reason, by: input.by, balanceAfterCents: Math.round(updated.balanceCents), at: new Date() });
  return true;
}

/**
 * Gives back the credit an order was holding or had used (order cancelled, deleted, card payment cancelled, or fully
 * refunded). Safe to call twice: the order's own state decides, in one atomic update, so the credit returns once.
 * Returns the cents given back (0 when there was nothing to give back).
 */
export async function restoreOrderCredit(orderId: string, reason: string): Promise<number> {
  const orders = await db.getCollectionForOperations<{ orderId: string; user?: string; storeCreditUsed?: number; storeCreditState?: string }>('orders');
  const claimed = await orders.findOneAndUpdate(
    { orderId, storeCreditState: { $in: ['held', 'applied'] }, storeCreditUsed: { $gt: 0 } },
    { $set: { storeCreditState: 'released', storeCreditReleasedAt: new Date() } } as never,
    { returnDocument: 'before' }
  );
  if (!claimed?.user) return 0;
  const cents = Math.round((claimed.storeCreditUsed ?? 0) * 100);
  if (!(cents > 0)) return 0;
  await addCredit({ userId: String(claimed.user), cents, type: 'restored', orderId, reason });
  return cents;
}

/** The order was paid: its held credit is now used for good. */
export async function markOrderCreditApplied(orderId: string): Promise<void> {
  await db.updateOne('orders', { orderId, storeCreditState: 'held' } as never, { $set: { storeCreditState: 'applied' } } as never);
}

/**
 * Cancelled orders hand their credit back. Run by the 30-minute cron. A paid order an admin cancelled gives it back at once;
 * an order whose card payment failed keeps it for 48 hours, because the customer can still pay that same order again.
 */
export async function sweepCancelledOrderCredit(now: Date = new Date(), limit = 50): Promise<{ checked: number; restored: number }> {
  const stale = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const found = await db.read<{ orderId: string }>(
    'orders',
    {
      status: 'cancelled',
      storeCreditState: { $in: ['held', 'applied'] },
      storeCreditUsed: { $gt: 0 },
      $or: [{ paymentStatus: { $in: ['paid', 'refunded'] } }, { updatedAt: { $lt: stale } }],
    } as never,
    { limit, projection: { orderId: 1 } }
  );
  const rows = found.success && found.data ? found.data : [];
  let restored = 0;
  for (const row of rows) {
    try {
      if ((await restoreOrderCredit(row.orderId, 'The order was cancelled')) > 0) restored += 1;
    } catch (error) {
      console.error('[store-credit] sweep could not restore', { orderId: row.orderId, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { checked: rows.length, restored };
}

/**
 * A payment succeeded on an order whose credit had already been handed back (the failed payment was retried later).
 * The credit is taken again; when the balance no longer covers it, the order is flagged so the team can sort it out.
 */
export async function reapplyReleasedCredit(order: { orderId: string; user?: string; storeCreditUsed?: number; storeCreditState?: string }): Promise<void> {
  if (order.storeCreditState !== 'released' || !order.storeCreditUsed || !order.user) return;
  const orders = await db.getCollectionForOperations<{ orderId: string }>('orders');
  const claimed = await orders.findOneAndUpdate(
    { orderId: order.orderId, storeCreditState: 'released' },
    { $set: { storeCreditState: 'applied' }, $unset: { storeCreditReleasedAt: '' } } as never,
    { returnDocument: 'before' }
  );
  if (!claimed) return;
  const cents = Math.round(order.storeCreditUsed * 100);
  const ok = await spendCredit({ userId: String(order.user), cents, orderId: order.orderId, reason: `Order ${order.orderId} was paid after its credit was handed back` });
  if (!ok) {
    await db.updateOne('orders', { orderId: order.orderId } as never, { $set: { storeCreditState: 'released', creditShortfall: order.storeCreditUsed } } as never);
    console.error('[store-credit] order paid after its credit was handed back and the balance no longer covers it', { orderId: order.orderId, cents });
  }
}

export async function getLedger(userId: string, limit = 50): Promise<Array<LedgerRow & { _id?: string }>> {
  const rows = await db.read<LedgerRow>(LEDGER, { userId } as never, { sort: { at: -1 }, limit });
  return rows.success && rows.data ? rows.data : [];
}

export { toDollars };

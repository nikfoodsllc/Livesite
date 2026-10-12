import { db } from '@/lib/server/db';
import { findClosedLines } from '@/lib/server/availableDates';
import type { RestoreLine } from '@/lib/server/checkoutDrafts';

/**
 * What the "Complete your order" button of the cart reminder email puts back: the cart lines of this customer's latest
 * unfinished checkout (an `open` draft that kept its lines), minus the lines whose delivery day can no longer be ordered.
 * Read only. A draft that was paid, replaced by a later payment, or older than its retention is never offered.
 */
const COLLECTION = 'checkoutDrafts';
/** Older than this the reminder no longer applies (prices and menus have moved on). */
const MAX_AGE_DAYS = 14;

export interface RestoreResult {
  lines: RestoreLine[];
  /** lines left out because ordering for their day has closed */
  removed: number;
}

export async function getRestorableCart(userId: string, now: Date = new Date()): Promise<RestoreResult> {
  const collection = await db.getCollectionForOperations<{ cartLines?: RestoreLine[] }>(COLLECTION);
  const since = new Date(now.getTime() - MAX_AGE_DAYS * 24 * 3600 * 1000);
  const draft = await collection.findOne(
    { userId, status: 'open', 'cartLines.0': { $exists: true }, lastActivityAt: { $gte: since } },
    { sort: { lastActivityAt: -1 }, projection: { cartLines: 1 } }
  );
  const lines = draft?.cartLines ?? [];
  if (lines.length === 0) return { lines: [], removed: 0 };
  const closed = await findClosedLines(
    lines.map((l) => ({ date: l.date, foodItemId: (l.foodItem as { _id?: unknown })._id, kind: l.listingType, name: String((l.foodItem as { name?: unknown }).name ?? '') }))
  );
  if (closed.length === 0) return { lines, removed: 0 };
  const isClosed = (l: RestoreLine) => closed.some((c) => c.date === l.date && (!c.foodItemId || c.foodItemId === String((l.foodItem as { _id?: unknown })._id)));
  const open = lines.filter((l) => !isClosed(l));
  return { lines: open, removed: lines.length - open.length };
}

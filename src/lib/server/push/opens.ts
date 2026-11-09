import { randomBytes } from 'crypto';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';

/**
 * Who opened which notification. Every push we send gets a `pushId` (written in the `pushEvents` line and inside the message's data).
 * When a customer taps the notification the app tells us, and we keep ONE line per customer per message in `pushOpens`.
 * Only taps count: iOS does not tell the app that a notification was only seen on the lock screen.
 */
const OPENS = 'pushOpens';
const EVENTS = 'pushEvents';

export const newPushId = (): string => randomBytes(12).toString('hex');
export const isPushId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{24}$/.test(value);

let indexReady = false;
async function opens() {
  const col = await db.getCollectionForOperations<Record<string, unknown>>(OPENS);
  if (!indexReady) {
    indexReady = true;
    await col.createIndex({ pushId: 1, userId: 1 }, { unique: true }).catch(() => undefined);
    await col.createIndex({ userId: 1, firstOpenedAt: -1 }).catch(() => undefined);
  }
  return col;
}

/** Records that a customer opened a message. Unknown messages are ignored. Opening twice only raises the count. */
export async function recordOpen(userId: string, pushId: string, now = new Date()): Promise<'recorded' | 'unknown'> {
  const events = await db.getCollectionForOperations<Record<string, unknown>>(EVENTS);
  const known = await events.findOne({ pushId } as never, { projection: { _id: 1, kind: 1 } } as never);
  if (!known) return 'unknown';
  const col = await opens();
  await col.updateOne(
    { pushId, userId } as never,
    { $setOnInsert: { firstOpenedAt: now, kind: (known as { kind?: string }).kind ?? '' }, $set: { lastOpenedAt: now }, $inc: { openCount: 1 } } as never,
    { upsert: true }
  );
  return 'recorded';
}

export interface SendRow {
  pushId: string;
  kind: string;
  event: string;
  title: string;
  sentAt: string;
  /** phones the message reached (what Expo accepted) */
  sent: number;
  /** customers the message went to (those who allow it) */
  customers: number;
  /** customers who tapped it */
  openedBy: number;
}

/** The newest messages with how many customers opened each (counts only). */
export async function recentSends(limit = 50, days = 30): Promise<SendRow[]> {
  const events = await db.getCollectionForOperations<Record<string, unknown>>(EVENTS);
  const since = new Date(Date.now() - days * 24 * 3_600_000);
  const rows = await events.find({ pushId: { $exists: true }, createdAt: { $gte: since } } as never).sort({ createdAt: -1 }).limit(Math.min(Math.max(limit, 1), 200)).toArray();
  if (rows.length === 0) return [];
  const col = await opens();
  const counts = await col.aggregate([{ $match: { pushId: { $in: rows.map((r) => String(r.pushId)) } } }, { $group: { _id: '$pushId', n: { $sum: 1 } } }]).toArray();
  const byId = new Map(counts.map((c) => [String(c._id), Number(c.n)]));
  return rows.map((r) => ({
    pushId: String(r.pushId),
    kind: String(r.kind ?? ''),
    event: String(r.event ?? ''),
    title: String(r.title ?? ''),
    sentAt: new Date(r.createdAt as Date).toISOString(),
    sent: Number(r.sent ?? 0),
    customers: Number(r.allowed ?? 0),
    openedBy: byId.get(String(r.pushId)) ?? 0,
  }));
}

export interface OpenerRow {
  userId: string;
  name: string;
  email: string;
  firstOpenedAt: string;
  openCount: number;
}

/** The customers who opened one message, earliest first. */
export async function openersOf(pushId: string): Promise<OpenerRow[]> {
  const col = await opens();
  const rows = await col.find({ pushId } as never).sort({ firstOpenedAt: 1 }).limit(2000).toArray();
  if (rows.length === 0) return [];
  const ids = rows.map((r) => String(r.userId)).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const users = await db.getCollectionForOperations<Record<string, unknown>>('users');
  const found = await users.find({ _id: { $in: ids } } as never, { projection: { fullName: 1, name: 1, email: 1 } } as never).toArray();
  const byId = new Map(found.map((u) => [String(u._id), u]));
  return rows.map((r) => {
    const u = byId.get(String(r.userId));
    return {
      userId: String(r.userId),
      name: String(u?.fullName ?? u?.name ?? ''),
      email: String(u?.email ?? ''),
      firstOpenedAt: new Date(r.firstOpenedAt as Date).toISOString(),
      openCount: Number(r.openCount ?? 1),
    };
  });
}

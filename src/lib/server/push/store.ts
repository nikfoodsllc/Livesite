import { db } from '@/lib/server/db';
import { isOlderVersion } from './appVersion';
import { DEFAULT_PREFS, isExpoToken, type PushPrefs } from './config';

const TOKENS = 'pushTokens';
const PREFS = 'pushPrefs';

interface TokenDoc {
  token: string;
  userId: string;
  platform: string;
  deviceName?: string;
  appVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

let indexReady = false;
async function tokens() {
  const col = await db.getCollectionForOperations<TokenDoc & Record<string, unknown>>(TOKENS);
  if (!indexReady) {
    indexReady = true;
    await col.createIndex({ token: 1 }, { unique: true }).catch(() => undefined);
    await col.createIndex({ userId: 1 }).catch(() => undefined);
  }
  return col;
}

/** Remembers a phone for a customer. A token belongs to one customer at a time (signing in as someone else moves it). */
export async function registerToken(userId: string, token: string, meta: { platform?: string; deviceName?: string; appVersion?: string } = {}): Promise<{ ok: boolean; error?: string }> {
  if (!userId) return { ok: false, error: 'No user' };
  if (!isExpoToken(token)) return { ok: false, error: 'That is not a push token' };
  const now = new Date();
  const col = await tokens();
  await col.updateOne(
    { token: token.trim() } as never,
    {
      $set: { userId, platform: String(meta.platform ?? 'ios').slice(0, 20), deviceName: String(meta.deviceName ?? '').slice(0, 60), appVersion: String(meta.appVersion ?? '').slice(0, 20), updatedAt: now },
      $setOnInsert: { createdAt: now },
    } as never,
    { upsert: true }
  );
  return { ok: true };
}

/** Forgets a phone (the customer logged out, or Expo said it is gone). With `userId` only that customer's entry is removed. */
export async function removeToken(token: string, userId?: string): Promise<number> {
  const col = await tokens();
  const r = await col.deleteMany({ token: token.trim(), ...(userId ? { userId } : {}) } as never);
  return r.deletedCount ?? 0;
}

export async function removeTokens(list: string[]): Promise<number> {
  if (list.length === 0) return 0;
  const col = await tokens();
  const r = await col.deleteMany({ token: { $in: list } } as never);
  return r.deletedCount ?? 0;
}

/** Every phone of these customers. */
export async function tokensForUsers(userIds: string[]): Promise<Array<{ token: string; userId: string }>> {
  if (userIds.length === 0) return [];
  const col = await tokens();
  const rows = await col.find({ userId: { $in: userIds } } as never, { projection: { token: 1, userId: 1 } }).toArray();
  return rows.map((r) => ({ token: String(r.token), userId: String(r.userId) }));
}

/** Phones of iPhone apps whose version is lower than `latest` (a phone that never reported its version counts as older). */
export async function phonesOnOlderVersion(latest: string): Promise<Array<{ token: string; userId: string }>> {
  const col = await tokens();
  const rows = await col.find({ platform: { $in: ['ios', '', null] } } as never, { projection: { token: 1, userId: 1, appVersion: 1 } }).toArray();
  return rows.filter((r) => isOlderVersion(r.appVersion, latest)).map((r) => ({ token: String(r.token), userId: String(r.userId) }));
}

export async function countTokenUsers(userIds?: string[]): Promise<number> {
  const col = await tokens();
  const ids = await col.distinct('userId', userIds ? ({ userId: { $in: userIds } } as never) : ({} as never));
  return ids.length;
}

/** The customers who have at least one phone registered, out of these (or of everyone). */
export async function usersWithTokens(userIds?: string[]): Promise<string[]> {
  const col = await tokens();
  const ids = await col.distinct('userId', userIds ? ({ userId: { $in: userIds } } as never) : ({} as never));
  return ids.map(String);
}

export async function getPrefs(userId: string): Promise<PushPrefs> {
  const col = await db.getCollectionForOperations<Record<string, unknown>>(PREFS);
  const doc = await col.findOne({ userId } as never);
  return mergePrefs(doc as Partial<PushPrefs> | null);
}

export const mergePrefs = (doc: Partial<PushPrefs> | null | undefined): PushPrefs => ({
  orders: typeof doc?.orders === 'boolean' ? doc.orders : DEFAULT_PREFS.orders,
  menu: typeof doc?.menu === 'boolean' ? doc.menu : DEFAULT_PREFS.menu,
  reminders: typeof doc?.reminders === 'boolean' ? doc.reminders : DEFAULT_PREFS.reminders,
  updates: typeof doc?.updates === 'boolean' ? doc.updates : DEFAULT_PREFS.updates,
});

export async function setPrefs(userId: string, change: Partial<PushPrefs>): Promise<PushPrefs> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ['orders', 'menu', 'reminders', 'updates'] as const) if (typeof change[k] === 'boolean') set[k] = change[k];
  const col = await db.getCollectionForOperations<Record<string, unknown>>(PREFS);
  await col.updateOne({ userId } as never, { $set: set, $setOnInsert: { userId, createdAt: new Date() } } as never, { upsert: true });
  return getPrefs(userId);
}

export async function prefsForUsers(userIds: string[]): Promise<Map<string, PushPrefs>> {
  const out = new Map<string, PushPrefs>();
  if (userIds.length === 0) return out;
  const col = await db.getCollectionForOperations<Record<string, unknown>>(PREFS);
  const rows = await col.find({ userId: { $in: userIds } } as never).toArray();
  for (const r of rows) out.set(String(r.userId), mergePrefs(r as Partial<PushPrefs>));
  return out;
}

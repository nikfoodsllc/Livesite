import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/server/db';

/**
 * "Sign in with Face ID" in the app: after a normal sign-in the phone gets a long random key that only the phone's Face ID can
 * unlock. The server keeps only a hash of it. The key can be used once per sign-in to get a fresh login, and it is cancelled when
 * the customer changes or resets their password, deletes the account, or turns Face ID sign-in off.
 */
const MAX_PER_USER = 5;
const LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

interface DeviceLoginDoc {
  userId: string;
  tokenHash: string;
  deviceName: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

async function collection() {
  const col = await db.getCollectionForOperations<Record<string, unknown>>('deviceLogins');
  await col.createIndex({ tokenHash: 1 }, { unique: true }).catch(() => undefined);
  await col.createIndex({ userId: 1 }).catch(() => undefined);
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
  return col;
}

/** Makes a new key for this customer's phone. Only the hash is saved; the key itself is returned once. */
export async function enrollDevice(userId: string, deviceName: string): Promise<string> {
  const col = await collection();
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  await col.insertOne({ userId, tokenHash: hashToken(token), deviceName: deviceName.slice(0, 60), createdAt: now, lastUsedAt: now, expiresAt: new Date(now.getTime() + LIFETIME_MS) } as never);
  // keep the newest few phones only
  const all = (await col.find({ userId } as never, { projection: { _id: 1 } }).sort({ createdAt: -1 }).toArray()) as Array<{ _id: unknown }>;
  const extra = all.slice(MAX_PER_USER).map((d) => d._id);
  if (extra.length > 0) await col.deleteMany({ _id: { $in: extra } } as never);
  return token;
}

/** Finds the customer a key belongs to (and keeps the key alive for another 90 days), or null. */
export async function redeemDeviceKey(token: string): Promise<string | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  const col = await collection();
  const now = new Date();
  const found = (await col.findOneAndUpdate(
    { tokenHash: hashToken(token), expiresAt: { $gt: now } } as never,
    { $set: { lastUsedAt: now, expiresAt: new Date(now.getTime() + LIFETIME_MS) } } as never,
    { returnDocument: 'after' }
  )) as unknown as DeviceLoginDoc | { value?: DeviceLoginDoc | null } | null;
  const doc = found && 'userId' in (found as object) ? (found as DeviceLoginDoc) : ((found as { value?: DeviceLoginDoc | null } | null)?.value ?? null);
  return doc ? doc.userId : null;
}

/** This phone turns Face ID sign-in off. */
export async function revokeDeviceKey(token: string): Promise<boolean> {
  if (typeof token !== 'string' || token.length < 20) return false;
  const col = await collection();
  const r = await col.deleteOne({ tokenHash: hashToken(token) } as never);
  return r.deletedCount > 0;
}

/** Password changed or reset, account deleted: every phone has to sign in with the password again. Never throws. */
export async function revokeAllDeviceKeysSafely(userId: string | undefined | null): Promise<void> {
  if (!userId) return;
  try {
    const col = await collection();
    await col.deleteMany({ userId: String(userId) } as never);
  } catch (error) {
    console.error('[deviceLogin] could not cancel the phone keys', error instanceof Error ? error.message : error);
  }
}

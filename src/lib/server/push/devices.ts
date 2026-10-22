import { db } from '@/lib/server/db';
import { removeToken } from './store';

/**
 * What the app tells us about each install: whether the phone allows notifications, so the admin can see customers who said No
 * (or were never asked) as well as the ones who said Yes. One record per customer and install; the app sends it every time it
 * opens signed in. The install id is made up by the app on first start (not the phone's own id).
 */
export type DevicePermission = 'granted' | 'denied' | 'undetermined';
export const DEVICE_PERMISSIONS: DevicePermission[] = ['granted', 'denied', 'undetermined'];

const DEVICES = 'pushDevices';

export interface DeviceDoc {
  userId: string;
  installId: string;
  permission: DevicePermission;
  platform: string;
  deviceName: string;
  appVersion: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  permissionChangedAt: Date;
}

let indexReady = false;
async function devices() {
  const col = await db.getCollectionForOperations<DeviceDoc & Record<string, unknown>>(DEVICES);
  if (!indexReady) {
    indexReady = true;
    await col.createIndex({ userId: 1, installId: 1 }, { unique: true }).catch(() => undefined);
  }
  return col;
}

export const isInstallId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v);
export const isPermission = (v: unknown): v is DevicePermission => typeof v === 'string' && (DEVICE_PERMISSIONS as string[]).includes(v);

/** Saves what this install told us. A phone that is no longer allowed also loses its push token, so nothing is sent to it. */
export async function reportDevice(
  userId: string,
  input: { installId: string; permission: DevicePermission; platform?: string; deviceName?: string; appVersion?: string; token?: string }
): Promise<void> {
  if (!userId) return;
  const now = new Date();
  const col = await devices();
  const before = await col.findOne({ userId, installId: input.installId } as never, { projection: { permission: 1 } });
  await col.updateOne(
    { userId, installId: input.installId } as never,
    {
      $set: {
        permission: input.permission,
        platform: String(input.platform ?? 'ios').slice(0, 20),
        deviceName: String(input.deviceName ?? '').slice(0, 60),
        appVersion: String(input.appVersion ?? '').slice(0, 20),
        lastSeenAt: now,
        ...(before?.permission === input.permission ? {} : { permissionChangedAt: now }),
      },
      $setOnInsert: { userId, installId: input.installId, firstSeenAt: now },
    } as never,
    { upsert: true }
  );
  if (input.permission !== 'granted' && input.token) await removeToken(input.token, userId);
}

/** Every reported install of these customers. */
export async function devicesForUsers(userIds: string[]): Promise<DeviceDoc[]> {
  if (userIds.length === 0) return [];
  const col = await devices();
  return (await col.find({ userId: { $in: userIds } } as never).toArray()) as unknown as DeviceDoc[];
}

/** Every install on file (the admin list), newest first. */
export async function allDevices(limit = 5000): Promise<DeviceDoc[]> {
  const col = await devices();
  return (await col.find({} as never).sort({ lastSeenAt: -1 }).limit(limit).toArray()) as unknown as DeviceDoc[];
}

/** Deletes everything push-related for a customer who deleted their account. Never throws. */
export async function forgetUserPush(userId: string): Promise<void> {
  try {
    for (const name of ['pushTokens', 'pushPrefs', DEVICES]) {
      const col = await db.getCollectionForOperations<Record<string, unknown>>(name);
      await col.deleteMany({ userId } as never);
    }
  } catch (error) {
    console.error('[push] could not clear a deleted customer', error instanceof Error ? error.message : String(error));
  }
}

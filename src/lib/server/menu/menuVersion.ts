import { db } from '@/lib/server/db';

/**
 * The menu version lives in one small document, { _id: 'homeMenu', version, updatedAt }, in the
 * `menuMeta` collection. The admin panel increases `version` (upsert) whenever menu data changes
 * (see admin/src/lib/invalidateHomeMenuCache.ts); this file only reads it.
 */
export const MENU_META_COLLECTION = 'menuMeta';
export const HOME_MENU_META_ID = 'homeMenu';

/** Current home menu version, or null if none has been recorded yet or the read failed. */
export async function readHomeMenuVersion(): Promise<number | null> {
  try {
    const collection = await db.getCollectionForOperations(MENU_META_COLLECTION);
    const doc = await collection.findOne({ _id: HOME_MENU_META_ID } as never);
    return typeof doc?.version === 'number' ? doc.version : null;
  } catch (error) {
    console.warn('[home-menu] Could not read the menu version; relying on the cache time limit:', error);
    return null;
  }
}

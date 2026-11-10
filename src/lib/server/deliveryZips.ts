import { db } from '@/lib/server/db';

const TTL_MS = 10 * 60 * 1000;
let cache: { zips: string[]; expiresAt: number } | null = null;

/**
 * The zip codes NikFoods delivers to, from the Delivery Zones tab in the admin (collection zincodes). Test entries (label has "test") are
 * left out. Cached for 10 minutes; any problem gives an empty list so a page never fails because of it.
 */
export async function getDeliveryZipcodes(): Promise<string[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.zips;
  try {
    const rows = await db.read<{ zipcode?: string; label?: string }>('zincodes', {} as never, { projection: { zipcode: 1, label: 1 }, limit: 1000 } as never);
    const zips = [...new Set((rows.success ? rows.data ?? [] : []).filter((r) => !/test/i.test(r.label ?? '')).map((r) => String(r.zipcode ?? '').trim()).filter((z) => /^\d{5}$/.test(z)))].sort();
    cache = { zips, expiresAt: Date.now() + TTL_MS };
    return zips;
  } catch (error) {
    console.error('[deliveryZips] could not read the delivery zones', error instanceof Error ? error.message : error);
    return cache?.zips ?? [];
  }
}

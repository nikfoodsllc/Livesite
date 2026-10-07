import type { HomeMenuPayload } from '@/lib/server/menu/buildHomeMenu';
import { cacheLifetimeMs } from '@/lib/server/orderCutoff';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { data: HomeMenuPayload; expiresAt: number } | null = null;

export function getCachedHomeMenu(): HomeMenuPayload | null {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }
  return null;
}

/**
 * Keeps the menu for up to 5 minutes, but never past the next moment ordering closes for a delivery date,
 * so a cutoff (standard or custom) takes effect on time instead of up to 5 minutes late.
 */
export function setCachedHomeMenu(data: HomeMenuPayload): void {
  const lifetime = cacheLifetimeMs(
    data.dates.flatMap((date) => [date.flatClosesAt ?? date.closesAt, date.dayWiseClosesAt ?? date.closesAt]),
    new Date(),
    CACHE_TTL_MS
  );
  cache = { data, expiresAt: Date.now() + lifetime };
}

export function invalidateHomeMenuCache(): void {
  cache = null;
}

/** Server keeps in-memory cache; browsers always revalidate so admin invalidation is visible immediately. */
export const HOME_MENU_CACHE_CONTROL = 'private, no-cache';

export const HOME_MENU_CACHE_TTL_SECONDS = CACHE_TTL_MS / 1000;

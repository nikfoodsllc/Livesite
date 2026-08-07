import type { HomeMenuPayload } from '@/lib/server/menu/buildHomeMenu';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { data: HomeMenuPayload; expiresAt: number } | null = null;

export function getCachedHomeMenu(): HomeMenuPayload | null {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }
  return null;
}

export function setCachedHomeMenu(data: HomeMenuPayload): void {
  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
}

export function invalidateHomeMenuCache(): void {
  cache = null;
}

/** Server keeps in-memory cache; browsers always revalidate so admin invalidation is visible immediately. */
export const HOME_MENU_CACHE_CONTROL = 'private, no-cache';

export const HOME_MENU_CACHE_TTL_SECONDS = CACHE_TTL_MS / 1000;

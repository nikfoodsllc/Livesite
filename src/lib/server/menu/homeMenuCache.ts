import type { HomeMenuPayload } from '@/lib/server/menu/buildHomeMenu';
import { createHomeMenuCache, DEFAULT_TTL_MS } from '@/lib/server/menu/createHomeMenuCache';
import { readHomeMenuVersion } from '@/lib/server/menu/menuVersion';

const cache = createHomeMenuCache<HomeMenuPayload>({ readVersion: readHomeMenuVersion });

/** The cached home menu if it is still current (time limit and menu version), otherwise null. */
export function getCachedHomeMenu(): Promise<HomeMenuPayload | null> {
  return cache.get();
}

/** Store a freshly built menu. Pass the version read BEFORE building it. */
export function setCachedHomeMenu(data: HomeMenuPayload, versionReadBeforeBuild: number | null): void {
  cache.set(data, versionReadBeforeBuild);
}

export function invalidateHomeMenuCache(): void {
  cache.invalidate();
}

export { readHomeMenuVersion };

/** Server keeps in-memory cache; browsers always revalidate so admin changes are visible immediately. */
export const HOME_MENU_CACHE_CONTROL = 'private, no-cache';

export const HOME_MENU_CACHE_TTL_SECONDS = DEFAULT_TTL_MS / 1000;

/**
 * In-memory cache for the built home menu, kept fresh by a "menu version" number.
 *
 * The admin panel bumps the version (a tiny document in the database) whenever menu data changes.
 * Every server instance compares it with the version its cached copy was built from, so a change is
 * picked up by all instances within VERSION_CHECK_INTERVAL_MS without any settings or secrets.
 *
 * The time limit (ttlMs) stays as a backstop for changes that do not bump the version, such as
 * edits made straight in the database, or if reading the version fails.
 *
 * Pure on purpose (the version reader and the clock are passed in) so it can be unit-tested.
 */

export interface HomeMenuCacheOptions {
  /** Reads the current menu version; null when there is none yet or the read failed. */
  readVersion: () => Promise<number | null>;
  now?: () => number;
  ttlMs?: number;
  /** At most one version read per instance in this period, so a burst of visitors is one read. */
  versionCheckIntervalMs?: number;
}

export const DEFAULT_TTL_MS = 5 * 60 * 1000;
export const DEFAULT_VERSION_CHECK_INTERVAL_MS = 5 * 1000;

export function createHomeMenuCache<T>({
  readVersion,
  now = Date.now,
  ttlMs = DEFAULT_TTL_MS,
  versionCheckIntervalMs = DEFAULT_VERSION_CHECK_INTERVAL_MS,
}: HomeMenuCacheOptions) {
  let cache: { data: T; expiresAt: number; version: number | null } | null = null;
  let lastVersionCheckAt = 0;

  return {
    /** The cached menu if it is still current, otherwise null (the caller should rebuild). */
    async get(): Promise<T | null> {
      if (!cache || now() >= cache.expiresAt) {
        return null;
      }
      if (now() - lastVersionCheckAt >= versionCheckIntervalMs) {
        const current = await readVersion();
        lastVersionCheckAt = now();
        // A failed read (null) keeps the cache and leaves it to the time limit.
        if (current !== null && current !== cache.version) {
          cache = null;
          return null;
        }
      }
      return cache.data;
    },

    /**
     * Read the version BEFORE building the menu and pass it here: if the admin changes something
     * while the menu is being built, the stored version is already out of date and the next check
     * rebuilds it.
     */
    set(data: T, versionReadBeforeBuild: number | null): void {
      cache = { data, expiresAt: now() + ttlMs, version: versionReadBeforeBuild };
      lastVersionCheckAt = now();
    },

    invalidate(): void {
      cache = null;
    },
  };
}

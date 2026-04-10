import { ZipcodeConfig } from '@/types/zipcode';

/**
 * Cache version for invalidation
 * Update this value to invalidate all existing caches
 */
export const CACHE_VERSION = '1.0';

/**
 * Time-to-live for cache entries (24 hours in milliseconds)
 */
export const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Cache entry structure stored in localStorage for zipcodes
 */
interface CacheEntry {
  data: ZipcodeConfig;
  timestamp: number;
  version: string;
}

/**
 * Generates a localStorage cache key for a given zipcode
 *
 * @param zipcode - The zipcode to generate a key for
 * @returns localStorage key string
 */
export function generateCacheKey(zipcode: string): string {
  return `zipcode_config_${zipcode}`;
}

/**
 * Validates if a cache entry is still valid
 *
 * @param cacheEntry - The cache entry to validate
 * @returns true if cache is valid (not expired and correct version)
 */
export function isCacheValid(cacheEntry: CacheEntry): boolean {
  if (!cacheEntry || !cacheEntry.timestamp || !cacheEntry.version) {
    return false;
  }

  // Check version match
  if (cacheEntry.version !== CACHE_VERSION) {
    return false;
  }

  // Check if cache has expired (24 hours)
  const now = Date.now();
  const age = now - cacheEntry.timestamp;
  return age < CACHE_TTL;
}

/**
 * Retrieves cached zipcode configuration from localStorage
 *
 * @param zipcode - The zipcode to retrieve from cache
 * @returns Cached config if valid, null otherwise
 */
export function getCachedZipcodeConfig(zipcode: string): ZipcodeConfig | null {
  try {
    const cacheKey = generateCacheKey(zipcode);
    const cachedValue = localStorage.getItem(cacheKey);

    if (!cachedValue) {
      return null;
    }

    const cacheEntry: CacheEntry = JSON.parse(cachedValue);

    // Validate cache entry
    if (!isCacheValid(cacheEntry)) {
      // Remove invalid cache
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cacheEntry.data;
  } catch (error) {
    // If JSON parsing fails or other error occurs, clear the cache
    console.error('Error reading zipcode cache:', error);
    const cacheKey = generateCacheKey(zipcode);
    localStorage.removeItem(cacheKey);
    return null;
  }
}

/**
 * Stores zipcode configuration in localStorage cache
 *
 * @param zipcode - The zipcode to cache
 * @param config - The configuration to store
 */
export function setCachedZipcodeConfig(zipcode: string, config: ZipcodeConfig): void {
  try {
    const cacheKey = generateCacheKey(zipcode);
    const cacheEntry: CacheEntry = {
      data: config,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error('Error caching zipcode config:', error);
    // Fail silently - caching is optional
  }
}

/**
 * Invalidates and removes cached configuration for a specific zipcode
 *
 * @param zipcode - The zipcode to invalidate
 */
export function invalidateZipcodeCache(zipcode: string): void {
  try {
    const cacheKey = generateCacheKey(zipcode);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Error invalidating zipcode cache:', error);
  }
}

/**
 * Clears all zipcode configuration caches from localStorage
 * Useful for testing or when needing to refresh all zipcode data
 */
export function clearAllZipcodeCache(): void {
  try {
    const keysToRemove: string[] = [];

    // Find all zipcode cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('zipcode_config_')) {
        keysToRemove.push(key);
      }
    }

    // Remove all zipcode cache entries
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all zipcode cache:', error);
  }
}

// ================== Address Cache Functions (Removed) ==================

/**
 * No-op invalidateAddressCache for backward compatibility.
 * Address caching has been removed - this function does nothing.
 *
 * @deprecated Address caching removed. This is a no-op for backward compatibility.
 */
export function invalidateAddressCache(): void {
  // Cache removed - this is now a no-op
  console.debug('[AddressCache] Cache removed - invalidateAddressCache is a no-op');
}

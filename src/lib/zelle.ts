/**
 * The Zelle address customers pay to for an admin-entered order they pay by Zelle (shown in the Zelle instructions email).
 * Change it without a release with the ZELLE_ID environment variable.
 */
export const DEFAULT_ZELLE_ID = 'nikfoodsllc@gmail.com';

export function getZelleId(env: Record<string, string | undefined> = process.env): string {
  const value = (env.ZELLE_ID ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : DEFAULT_ZELLE_ID;
}

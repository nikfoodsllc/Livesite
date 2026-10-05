/**
 * The address of the site that is sending an email, for the links inside it.
 *
 * Live site: always https://www.nikfoods.com. On the test site (livesite-dev) Vercel sets
 * VERCEL_PROJECT_PRODUCTION_URL to its own *.vercel.app address, so a test email opens the test
 * site (where the test account exists) instead of the live one. A project with a custom domain,
 * and local runs, keep the live address.
 */
export const LIVE_SITE_URL = 'https://www.nikfoods.com';

export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (host && /^[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(host)) return `https://${host}`;
  return LIVE_SITE_URL;
}

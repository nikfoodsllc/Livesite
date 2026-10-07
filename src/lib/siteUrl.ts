/**
 * The address of the site that is sending an email, for the links inside it, and whether it is the test site.
 *
 * Live site: always https://www.nikfoods.com, with the real subject. Only the known test site
 * (livesite-dev) and Vercel preview/development builds count as "test": there, links open the test site
 * (where the test account exists) and subjects carry a test marker. Any other address, even another
 * *.vercel.app one, is treated as live, so a live email can never be marked as a test or point at a test
 * address (for example if the live project ever lost its custom domain).
 */
export const LIVE_SITE_URL = 'https://www.nikfoods.com';

/** The only host (besides Vercel preview/development builds) that is treated as the test site. */
export const TEST_SITE_HOSTS = ['livesite-dev.vercel.app'];

function productionHost(env: Record<string, string | undefined>): string {
  return (env.VERCEL_PROJECT_PRODUCTION_URL ?? '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
}

/** True on the test site (livesite-dev) and on Vercel preview/development builds; false everywhere else. */
export function isTestSite(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'development') return true;
  return TEST_SITE_HOSTS.includes(productionHost(env));
}

/** The base address for links in emails: the test site's own address on the test site, otherwise the live site. */
export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const host = productionHost(env);
  return TEST_SITE_HOSTS.includes(host) ? `https://${host}` : LIVE_SITE_URL;
}

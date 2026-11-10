import type { MetadataRoute } from 'next';
import { PRIVATE_PATHS, SITE_URL } from '@/lib/seo';
import { isTestSite } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  // the test site (livesite-dev) and preview builds must never appear in search results
  if (isTestSite()) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', ...PRIVATE_PATHS] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

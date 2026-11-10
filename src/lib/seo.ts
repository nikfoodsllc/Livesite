/** Shared facts for search engines (page titles, sharing cards, structured data). Keep the wording in step with the real site. */
export const SITE_URL = 'https://www.nikfoods.com';
export const SITE_NAME = 'NikFoods';
export const SITE_TAGLINE = 'Authentic Indian food delivered to your door';
export const SITE_DESCRIPTION = 'Order fresh, home-style Indian meals online from NikFoods: weekly menus, combos, snacks and sweets, delivered to your door.';
export const SOCIAL_LINKS = ['https://facebook.com/nikfoodsllc', 'https://instagram.com/Nikfoods_IndianOrganic'];
export const SUPPORT_EMAIL = 'support@nikfoods.com';
export const APP_STORE_URL = 'https://apps.apple.com/app/id6767141830';

/** Pages that are for customers only and must stay out of search results. */
export const PRIVATE_PATHS = ['/account', '/cart', '/checkout', '/pay', '/unsubscribe', '/sms'];

/** Organization + website facts as JSON-LD (what Google shows in the knowledge panel / sitelinks). */
export function siteJsonLd(): Record<string, unknown>[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo.png`,
      email: SUPPORT_EMAIL,
      description: SITE_DESCRIPTION,
      sameAs: SOCIAL_LINKS,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ];
}

/** FAQ questions as JSON-LD (can show as expandable answers in Google). */
export function faqJsonLd(sections: Array<{ items: Array<{ question: string; answer: string }> }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sections.flatMap((s) => s.items).map((i) => ({ '@type': 'Question', name: i.question, acceptedAnswer: { '@type': 'Answer', text: i.answer } })),
  };
}

/** JSON-LD must not be able to close the script tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

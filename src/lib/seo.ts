/** Shared facts for search engines (page titles, sharing cards, structured data). Keep the wording in step with the real site. */
export const SITE_URL = 'https://www.nikfoods.com';
export const SITE_NAME = 'NikFoods';
export const SITE_TAGLINE = 'Authentic Indian food delivered to your door';
export const SITE_DESCRIPTION = 'Order fresh, home-style Indian meals online from NikFoods: weekly menus, combos, snacks and sweets, delivered to your door in Seattle, Bellevue, Kirkland, Redmond, Sammamish and nearby areas of Washington.';
export const SOCIAL_LINKS = ['https://facebook.com/nikfoodsllc', 'https://instagram.com/Nikfoods_IndianOrganic'];
export const SUPPORT_EMAIL = 'support@nikfoods.com';
export const APP_STORE_URL = 'https://apps.apple.com/app/id6767141830';

/** Pages that are for customers only and must stay out of search results. */
export const PRIVATE_PATHS = ['/account', '/cart', '/checkout', '/pay', '/unsubscribe', '/sms'];

/** The business as JSON-LD, with the zip codes it delivers to (from the Delivery Zones tab). */
export function organizationJsonLd(zips: string[] = []): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    email: SUPPORT_EMAIL,
    description: SITE_DESCRIPTION,
    sameAs: SOCIAL_LINKS,
    ...(zips.length ? { areaServed: zips.map((postalCode) => ({ '@type': 'Place', address: { '@type': 'PostalAddress', postalCode, addressRegion: 'WA', addressCountry: 'US' } })) } : {}),
  };
}

/** The website itself as JSON-LD (every page). */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

interface MenuItemLike {
  name?: string;
  description?: string;
  price?: number;
  portionPrices?: number[];
  veg?: boolean;
  unavailable?: boolean;
}
interface MenuCategoryLike {
  name?: string;
  foodItems?: MenuItemLike[];
  dayWiseItems?: Record<string, MenuItemLike[]> | null;
}

/** The menu as JSON-LD (sections with dish name, short description, price, vegetarian). Each dish once; capped so the page stays light. */
export function menuJsonLd(categoryItems: Record<string, MenuCategoryLike>, maxItems = 150): Record<string, unknown> | null {
  const seen = new Set<string>();
  let count = 0;
  const sections: Record<string, unknown>[] = [];
  for (const cat of Object.values(categoryItems)) {
    const raw = [...(cat.foodItems ?? []), ...Object.values(cat.dayWiseItems ?? {}).flat()];
    const items: Record<string, unknown>[] = [];
    for (const it of raw) {
      const name = String(it?.name ?? '').trim();
      const price = it?.portionPrices?.length ? it.portionPrices[0] : it?.price;
      if (!name || seen.has(name.toLowerCase()) || count >= maxItems) continue;
      seen.add(name.toLowerCase());
      count++;
      items.push({
        '@type': 'MenuItem',
        name,
        ...(it.description ? { description: String(it.description).slice(0, 200) } : {}),
        ...(typeof price === 'number' && price > 0 ? { offers: { '@type': 'Offer', price: price.toFixed(2), priceCurrency: 'USD' } } : {}),
        ...(it.veg ? { suitableForDiet: 'https://schema.org/VegetarianDiet' } : {}),
      });
    }
    if (items.length) sections.push({ '@type': 'MenuSection', name: String(cat.name ?? 'Menu'), hasMenuItem: items });
  }
  if (sections.length === 0) return null;
  return { '@context': 'https://schema.org', '@type': 'Menu', name: `${SITE_NAME} menu`, url: SITE_URL, inLanguage: 'en', hasMenuSection: sections };
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

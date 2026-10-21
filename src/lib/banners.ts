/**
 * Home-page banners (managed in the admin, shown on the website and in the app). Pure helpers: the shape a customer gets, whether a
 * banner is live right now, and the Cloudinary crop that makes any uploaded picture a clean 2:1 banner.
 */
export type BannerLinkType = 'none' | 'category' | 'url';

export interface BannerDoc {
  _id?: unknown;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  linkType?: BannerLinkType;
  categoryId?: string;
  url?: string;
  active?: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  sequence?: number;
  /** how long it stays on show before the carousel moves on (seconds) */
  durationSeconds?: number;
}

export interface PublicBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkType: BannerLinkType;
  categoryId: string;
  url: string;
  /** seconds this banner stays on show before the next one (2 to 60; 5 when the admin never set it) */
  durationSeconds: number;
}

export const DEFAULT_BANNER_SECONDS = 5;

/** The stay time of a banner, always a sensible whole number of seconds. */
export function bannerSeconds(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 2 && n <= 60 ? n : DEFAULT_BANNER_SECONDS;
}

const ms = (v: Date | string | null | undefined): number | null => {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

/** Is this banner to be shown at `now`: switched on, started, and not ended. */
export function isLive(banner: BannerDoc, now: Date = new Date()): boolean {
  if (banner.active === false) return false;
  const start = ms(banner.startsAt);
  const end = ms(banner.endsAt);
  if (start !== null && now.getTime() < start) return false;
  if (end !== null && now.getTime() > end) return false;
  return Boolean(banner.imageUrl);
}

/** Cloudinary: the WHOLE picture (never cropped), at most 1600 px wide, modern format, sensible quality. Other addresses pass through. */
export function bannerImageUrl(url: string | undefined): string {
  const u = String(url ?? '');
  try {
    const parsed = new URL(u);
    if (parsed.hostname !== 'res.cloudinary.com') return u;
    const marker = '/upload/';
    const at = parsed.pathname.indexOf(marker);
    if (at < 0) return u;
    const rest = parsed.pathname.slice(at + marker.length);
    // already transformed (the next part before the version/folder looks like "c_limit,w_..."): leave it alone
    if (/^[a-z]{1,3}_[^/]+,/.test(rest) || /^(c|w|h|ar|f|q)_[^/]*\//.test(rest)) return u;
    return `${parsed.origin}${parsed.pathname.slice(0, at + marker.length)}c_limit,w_1600,f_auto,q_auto/${rest}${parsed.search}`;
  } catch {
    return u;
  }
}

export function toPublicBanner(doc: BannerDoc): PublicBanner {
  const linkType: BannerLinkType = doc.linkType === 'category' || doc.linkType === 'url' ? doc.linkType : 'none';
  return {
    id: String(doc._id ?? ''),
    title: String(doc.title ?? '').slice(0, 80),
    subtitle: String(doc.subtitle ?? '').slice(0, 140),
    imageUrl: bannerImageUrl(doc.imageUrl),
    linkType,
    categoryId: linkType === 'category' ? String(doc.categoryId ?? '') : '',
    url: linkType === 'url' && /^https:\/\//i.test(String(doc.url ?? '')) ? String(doc.url) : '',
    durationSeconds: bannerSeconds(doc.durationSeconds),
  };
}

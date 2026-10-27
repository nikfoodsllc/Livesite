import { db } from '@/lib/server/db';
import { isLive, toPublicBanner, toPublicPopup, type BannerDoc, type PublicBanner, type PublicPopup } from '@/lib/banners';

/** The banners to show right now, in the order the admin set (at most 10). */
export async function listLiveBanners(now: Date = new Date()): Promise<PublicBanner[]> {
  const col = await db.getCollectionForOperations<Record<string, unknown>>('banners');
  const docs = (await col.find({ active: { $ne: false }, placement: { $ne: 'popup' } } as never).sort({ sequence: 1, createdAt: 1 }).limit(40).toArray()) as unknown as BannerDoc[];
  return docs
    .filter((b) => isLive(b, now))
    .map(toPublicBanner)
    .filter((b) => (b.linkType !== 'category' || b.categoryId) && b.imageUrl)
    .slice(0, 10);
}

/**
 * The pop-up for the site. `managed` is false until an admin adds a popup (then the site shows its built-in one); once any popup exists
 * (even switched off) the admin decides: the first live one is shown, or none.
 */
export async function listLivePopup(now: Date = new Date()): Promise<{ managed: boolean; popup: PublicPopup | null }> {
  const col = await db.getCollectionForOperations<Record<string, unknown>>('banners');
  const docs = (await col.find({ placement: 'popup' } as never).sort({ sequence: 1, createdAt: 1 }).limit(40).toArray()) as unknown as BannerDoc[];
  if (docs.length === 0) return { managed: false, popup: null };
  const live = docs.find((d) => isLive(d, now));
  return { managed: true, popup: live ? toPublicPopup(live) : null };
}

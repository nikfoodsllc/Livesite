import { db } from '@/lib/server/db';
import { isLive, toPublicBanner, type BannerDoc, type PublicBanner } from '@/lib/banners';

/** The banners to show right now, in the order the admin set (at most 10). */
export async function listLiveBanners(now: Date = new Date()): Promise<PublicBanner[]> {
  const col = await db.getCollectionForOperations<Record<string, unknown>>('banners');
  const docs = (await col.find({ active: { $ne: false } } as never).sort({ sequence: 1, createdAt: 1 }).limit(40).toArray()) as unknown as BannerDoc[];
  return docs
    .filter((b) => isLive(b, now))
    .map(toPublicBanner)
    .filter((b) => (b.linkType !== 'category' || b.categoryId) && b.imageUrl)
    .slice(0, 10);
}

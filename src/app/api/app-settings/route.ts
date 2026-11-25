import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { cleanVersion } from '@/lib/server/push/appVersion';

export const dynamic = 'force-dynamic';

/** GET /api/app-settings (public): texts the admin sets for the app's home screen. `homeIntro` is '' when the admin has not set one. Cached for only 15 s so a saved change shows quickly. */
export async function GET() {
  try {
    const col = await db.getCollectionForOperations<Record<string, unknown>>('appSettings');
    const doc = (await col.findOne({ key: 'home' } as never)) as { intro?: unknown } | null;
    const homeIntro = typeof doc?.intro === 'string' ? doc.intro : '';
    // the newest app version in each store ('' = not set): the app shows "Update available" when it is older.
    // latestVersion = iPhone (App Store; older iPhone builds read only this), latestVersionAndroid = Google Play
    const app = (await col.findOne({ key: 'app' } as never)) as { latestVersion?: unknown; latestAndroidVersion?: unknown } | null;
    const latestVersion = cleanVersion(app?.latestVersion) ?? '';
    const latestVersionAndroid = cleanVersion(app?.latestAndroidVersion) ?? '';
    return NextResponse.json({ success: true, data: { homeIntro, latestVersion, latestVersionAndroid } }, { headers: { 'Cache-Control': 'public, s-maxage=15' } });
  } catch (error) {
    console.error('[app-settings] could not load', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: true, data: { homeIntro: '', latestVersion: '', latestVersionAndroid: '' } }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

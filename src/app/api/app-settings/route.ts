import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/** GET /api/app-settings (public): texts the admin sets for the app's home screen. `homeIntro` is '' when the admin has not set one. */
export async function GET() {
  try {
    const col = await db.getCollectionForOperations<Record<string, unknown>>('appSettings');
    const doc = (await col.findOne({ key: 'home' } as never)) as { intro?: unknown } | null;
    const homeIntro = typeof doc?.intro === 'string' ? doc.intro : '';
    return NextResponse.json({ success: true, data: { homeIntro } }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('[app-settings] could not load', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: true, data: { homeIntro: '' } }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

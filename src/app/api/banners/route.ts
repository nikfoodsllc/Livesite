import { NextResponse } from 'next/server';
import { listLiveBanners } from '@/lib/server/banners';

export const dynamic = 'force-dynamic';

/** GET /api/banners (public): the home-page banners that are live now. The website and the app both read this. */
export async function GET() {
  try {
    const banners = await listLiveBanners();
    return NextResponse.json({ success: true, data: banners }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('[banners] could not load', error instanceof Error ? error.message : error);
    // the banners are optional: the page simply shows none
    return NextResponse.json({ success: true, data: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

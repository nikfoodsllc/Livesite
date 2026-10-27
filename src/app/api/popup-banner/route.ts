import { NextResponse } from 'next/server';
import { listLivePopup } from '@/lib/server/banners';

export const dynamic = 'force-dynamic';

/** GET /api/popup-banner (public): the pop-up the site opens with. `managed` false = no admin popup yet, the site uses its built-in one. */
export async function GET() {
  try {
    const { managed, popup } = await listLivePopup();
    return NextResponse.json({ success: true, managed, data: popup }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' } });
  } catch (error) {
    console.error('[popup-banner] could not load', error instanceof Error ? error.message : error);
    // the pop-up is optional: on a failure the site simply shows none
    return NextResponse.json({ success: false, managed: true, data: null }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

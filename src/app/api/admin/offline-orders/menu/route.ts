import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { loadMenu, orderableDates } from '@/lib/server/offlineMenu';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/offline-orders/menu: the menu as customers see it now, plus the days that can still be
 * ordered for (the picker only offers those).
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const menu = await loadMenu();
    return NextResponse.json({ success: true, data: { ...menu, openDates: orderableDates(menu).map((d) => d.date) } });
  } catch (error) {
    console.error('[offline-orders] menu failed', error);
    return NextResponse.json({ success: false, error: 'Could not load the menu' }, { status: 500 });
  }
}

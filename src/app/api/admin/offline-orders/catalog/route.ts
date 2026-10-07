import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { buildOfflineCatalog } from '@/lib/server/offlineCatalog';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/offline-orders/catalog: the whole menu (every category, sub-category and item, day-wise items of any
 * date) and the days the admin can pick, with no cutoff filtering. For the admin's Create Order screen only.
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ success: true, data: await buildOfflineCatalog() });
  } catch (error) {
    console.error('[offline-orders] catalog failed', error);
    return NextResponse.json({ success: false, error: 'Could not load the menu' }, { status: 500 });
  }
}

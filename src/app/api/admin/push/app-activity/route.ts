import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { loadAppActivity } from '@/lib/server/push/activity';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/push/app-activity?days=14: how many customers come to the app each day, the people who have it, new phones, and the
 * orders placed in the app. Counts only (no names). Read only.
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const raw = Number(request.nextUrl.searchParams.get('days'));
  try {
    return NextResponse.json({ success: true, data: await loadAppActivity(Number.isFinite(raw) && raw > 0 ? raw : 14) });
  } catch (error) {
    console.error('[app-activity] failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Could not load the app activity' }, { status: 500 });
  }
}

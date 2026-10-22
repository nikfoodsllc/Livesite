import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { listAppUsers } from '@/lib/server/push/appUsers';

export const dynamic = 'force-dynamic';

/** GET /api/admin/push/app-users: the customers who have the app with notifications allowed, their switches and counts. Read only. */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ success: true, data: await listAppUsers() });
  } catch (error) {
    console.error('[push] app users failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Could not load the app customers' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { isPushId, openersOf, recentSends } from '@/lib/server/push/opens';

export const dynamic = 'force-dynamic';

/** GET /api/admin/push/opens: the newest messages with how many customers opened them. With ?pushId=...: who opened that one. */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const pushId = searchParams.get('pushId');
    if (pushId !== null) {
      if (!isPushId(pushId)) return NextResponse.json({ success: false, error: 'Invalid message id' }, { status: 400 });
      return NextResponse.json({ success: true, data: { openers: await openersOf(pushId) } });
    }
    const limit = Number(searchParams.get('limit') ?? 50);
    const days = Number(searchParams.get('days') ?? 30);
    return NextResponse.json({ success: true, data: { sends: await recentSends(Number.isFinite(limit) ? limit : 50, Number.isFinite(days) && days > 0 ? Math.min(days, 180) : 30) } });
  } catch (error) {
    console.error('[push] opens failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Could not load' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { userIdFrom } from '@/lib/server/push/auth';
import { isPushId, recordOpen } from '@/lib/server/push/opens';

export const dynamic = 'force-dynamic';

/** POST /api/push/opened { pushId }: the app says this customer tapped a notification. Only ever marks the signed-in customer. */
export async function POST(request: NextRequest) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isPushId(body.pushId)) return NextResponse.json({ success: false, error: 'Invalid message id' }, { status: 400 });
  try {
    const result = await recordOpen(userId, body.pushId);
    return NextResponse.json({ success: true, data: { result } });
  } catch (error) {
    console.error('[push] open failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Could not save' }, { status: 500 });
  }
}

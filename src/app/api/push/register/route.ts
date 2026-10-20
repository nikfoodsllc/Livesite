import { NextRequest, NextResponse } from 'next/server';
import { userIdFrom } from '@/lib/server/push/auth';
import { registerToken, removeToken } from '@/lib/server/push/store';

export const dynamic = 'force-dynamic';

/** POST /api/push/register { token, platform?, deviceName?, appVersion? }: the app tells us this phone can get notifications. */
export async function POST(request: NextRequest) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { token?: unknown; platform?: unknown; deviceName?: unknown; appVersion?: unknown };
  const result = await registerToken(userId, String(body.token ?? ''), { platform: String(body.platform ?? 'ios'), deviceName: String(body.deviceName ?? ''), appVersion: String(body.appVersion ?? '') });
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}

/** DELETE /api/push/register { token }: the customer logged out of the app, so this phone stops getting their notifications. */
export async function DELETE(request: NextRequest) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { token?: unknown };
  if (typeof body.token !== 'string' || !body.token) return NextResponse.json({ success: false, error: 'No token' }, { status: 400 });
  await removeToken(body.token, userId);
  return NextResponse.json({ success: true });
}

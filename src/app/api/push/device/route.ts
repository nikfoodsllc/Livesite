import { NextRequest, NextResponse } from 'next/server';
import { userIdFrom } from '@/lib/server/push/auth';
import { isInstallId, isPermission, reportDevice } from '@/lib/server/push/devices';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/device { installId, permission: granted | denied | undetermined, platform?, deviceName?, appVersion?, token? }:
 * the app tells us whether this phone allows notifications (also when it does not), so the admin sees who said No.
 * `token` is the push token the app still holds; when the phone no longer allows notifications it is forgotten.
 */
export async function POST(request: NextRequest) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isInstallId(body.installId)) return NextResponse.json({ success: false, error: 'Invalid install id' }, { status: 400 });
  if (!isPermission(body.permission)) return NextResponse.json({ success: false, error: 'Invalid permission' }, { status: 400 });
  await reportDevice(userId, {
    installId: body.installId,
    permission: body.permission,
    platform: String(body.platform ?? 'ios'),
    deviceName: String(body.deviceName ?? ''),
    appVersion: String(body.appVersion ?? ''),
    token: typeof body.token === 'string' ? body.token : undefined,
  });
  return NextResponse.json({ success: true });
}

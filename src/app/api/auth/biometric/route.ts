import { NextRequest, NextResponse } from 'next/server';
import { userIdFrom } from '@/lib/server/push/auth';
import { db } from '@/lib/server/db';
import { ObjectId } from 'mongodb';
import { enrollDevice, revokeDeviceKey } from '@/lib/server/deviceLogin';

export const dynamic = 'force-dynamic';

/** POST { deviceName? } (signed in as a customer): give this phone a Face ID sign-in key. The key is returned once. */
export async function POST(request: NextRequest) {
  const userId = userIdFrom(request);
  if (!userId || !ObjectId.isValid(userId)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const found = await db.readOne<{ role?: string }>('users', { _id: new ObjectId(userId) } as never);
  if (!found.success || !found.data) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // admins sign in on the admin site with their password; Face ID sign-in is for customers
  if (String(found.data.role ?? '').toUpperCase() !== 'USER') return NextResponse.json({ error: 'Not available for this account' }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { deviceName?: unknown };
  const deviceName = typeof body.deviceName === 'string' ? body.deviceName : '';
  const deviceKey = await enrollDevice(userId, deviceName);
  return NextResponse.json({ success: true, data: { deviceKey } });
}

/** DELETE { deviceKey }: this phone turns Face ID sign-in off (the key itself is the proof, so no sign-in is needed). */
export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { deviceKey?: unknown };
  const removed = await revokeDeviceKey(typeof body.deviceKey === 'string' ? body.deviceKey : '');
  return NextResponse.json({ success: true, data: { removed } });
}

import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { db } from '@/lib/server/db';
import { ObjectId } from 'mongodb';
import { getSmsConsent, sendWelcomeText, setSmsConsent } from '@/lib/server/smsService';

export const dynamic = 'force-dynamic';

function userIdOf(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const decoded = jwtHandler.verifyToken(header.substring(7));
  return decoded.success && decoded.payload ? String(decoded.payload.userId) : null;
}

/** GET /api/account/sms-consent: the logged in customer's text-message choice. */
export async function GET(request: NextRequest) {
  const userId = userIdOf(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const consent = await getSmsConsent(userId);
  return NextResponse.json({ success: true, data: { optedIn: Boolean(consent?.optedIn), phone: consent?.phone ?? null } });
}

/** PUT /api/account/sms-consent { optedIn }: agree to or stop text messages; agreeing uses the phone number on the profile. */
export async function PUT(request: NextRequest) {
  const userId = userIdOf(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body?.optedIn !== 'boolean') return NextResponse.json({ error: 'optedIn must be true or false' }, { status: 400 });
  let phone: unknown;
  if (body.optedIn) {
    const user = await db.readOne<{ phone?: string }>('users', { _id: new ObjectId(userId) } as never);
    phone = user.success ? user.data?.phone : undefined;
  }
  const result = await setSmsConsent(userId, { optedIn: body.optedIn, phone, source: 'profile' });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  if (result.newlyOptedIn) await sendWelcomeText(userId);
  return NextResponse.json({ success: true, data: { optedIn: result.optedIn } });
}

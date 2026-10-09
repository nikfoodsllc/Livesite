import { NextRequest, NextResponse } from 'next/server';
import { subscribePublic } from '@/lib/server/smsService';

export const dynamic = 'force-dynamic';

/** POST /api/sms/subscribe { phone, agreed: true }: the public Text Updates sign-up (no login). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || undefined;
  const result = await subscribePublic({ phone: body?.phone, agreed: body?.agreed, ip, userAgent: request.headers.get('user-agent') ?? undefined });
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  return NextResponse.json({ success: true, data: { alreadySubscribed: result.alreadySubscribed } });
}

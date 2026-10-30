import { NextRequest, NextResponse } from 'next/server';
import { recordOptOut } from '@/lib/server/emailOptOut';

export const dynamic = 'force-dynamic';

/** POST /api/unsubscribe { email }: the public do-not-email request (no login). Always the same answer for a valid address. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ok = await recordOptOut(body?.email).catch((error) => {
    console.error('[unsubscribe] failed', error instanceof Error ? error.message : error);
    return null;
  });
  if (ok === null) return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  if (!ok) return NextResponse.json({ success: false, error: 'Enter a valid email.' }, { status: 400 });
  return NextResponse.json({ success: true });
}

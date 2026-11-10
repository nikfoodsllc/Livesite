import { NextRequest, NextResponse } from 'next/server';
import { recordOptOut, turnOffEmailSubscription } from '@/lib/server/emailOptOut';
import { sendUnsubscribeAlertEmail } from '@/lib/unsubscribeAlertEmail';

export const dynamic = 'force-dynamic';

/**
 * POST /api/unsubscribe { email }: the public "stop our emails" request (no login). The address goes on the unsubscribe list, the menu alerts
 * subscription is switched off, and the
 * team gets ONE email the first time so they can take the person off the Wix list. Same answer for a repeat.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  let result;
  try {
    result = await recordOptOut(body?.email);
  } catch (error) {
    console.error('[unsubscribe] failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
  if (!result.valid) return NextResponse.json({ success: false, error: 'Enter a valid email.' }, { status: 400 });
  // "subscribed to emails" turns off at the same moment (also on a repeat, e.g. after an admin had turned emails off first)
  try {
    await turnOffEmailSubscription(result.email);
  } catch (error) {
    console.error('[unsubscribe] could not switch off the subscription', error instanceof Error ? error.message : error);
  }
  if (result.isNew) {
    const sent = await sendUnsubscribeAlertEmail(result.email);
    if (!sent.success) console.error('[unsubscribe] team email not sent:', sent.error);
  }
  return NextResponse.json({ success: true });
}

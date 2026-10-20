import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/lib/server/db';
import { pushMode } from '@/lib/server/push/config';
import { sendPush } from '@/lib/server/push/send';
import { checkText } from '@/lib/server/push/templates';

export const dynamic = 'force-dynamic';

/** POST { email, title, body }: send a test notification to one customer's phones (whatever their settings), to see it on a real phone. */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; title?: unknown; body?: unknown };
  const text = checkText(body.title, body.body);
  if (!text.ok) return NextResponse.json({ success: false, error: text.error }, { status: 400 });
  if (pushMode() === 'off') return NextResponse.json({ success: false, error: 'Notifications are switched off on this site (PUSH).' }, { status: 409 });
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email.includes('@')) return NextResponse.json({ success: false, error: 'Type the email of the customer account to test with' }, { status: 400 });
  const users = await db.getCollectionForOperations<Record<string, unknown>>('users');
  const user = await users.findOne({ email } as never, { projection: { _id: 1 } });
  if (!user) return NextResponse.json({ success: false, error: 'No customer account with that email' }, { status: 404 });
  const summary = await sendPush({ userIds: [String(user._id)], kind: 'menu', title: text.title, body: text.body, data: { type: 'menu' }, ignorePrefs: true, log: { event: 'test' } });
  if (summary.tokens === 0) return NextResponse.json({ success: false, error: 'That account has no phone with the app and notifications on yet' }, { status: 409 });
  return NextResponse.json({ success: true, data: { mode: summary.mode, phones: summary.tokens, sent: summary.sent, failed: summary.failed, removed: summary.removed, errors: summary.errors } });
}

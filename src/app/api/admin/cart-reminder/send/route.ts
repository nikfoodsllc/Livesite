import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { sendReminderNow } from '@/lib/server/cartReminders';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/cart-reminder/send {paymentIntentId, again?}: an admin pressed Email on a person in Abandoned Checkout. Sends the
 * cart reminder email now (same email, same tracking as the automatic one) from the site's own sender. Admins only. A checkout that already got one is refused unless the admin confirmed `again` (then a new email with its own log goes out, never within 30 seconds of the last).
 */
export async function POST(request: NextRequest) {
  const who = requireAdminWithId(request);
  if ('error' in who) return who.error;
  const body = await request.json().catch(() => null);
  const id = typeof body?.paymentIntentId === 'string' ? body.paymentIntentId : '';
  if (!/^pi_[A-Za-z0-9_]{6,80}$/.test(id)) return NextResponse.json({ success: false, error: 'Invalid checkout' }, { status: 400 });
  try {
    const result = await sendReminderNow(id, who.adminId, body?.again === true);
    if (result.ok) return NextResponse.json({ success: true });
    const status = result.code === 'not_found' ? 404 : result.code === 'send_failed' ? 502 : 409;
    return NextResponse.json({ success: false, code: result.code, error: result.message }, { status });
  } catch (error) {
    console.error('[cart-reminder-send] failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Could not send the reminder' }, { status: 500 });
  }
}

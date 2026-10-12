import { NextRequest, NextResponse } from 'next/server';
import { recordCartReminderClick } from '@/lib/server/cartReminderTracking';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cart-reminder/clicked {t}: the cart page calls this once it has rendered in the customer's browser after they
 * pressed "Complete your order" in the reminder email. It only ever answers {success: true}, counted or not, so the secret in
 * the link cannot be probed.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  await recordCartReminderClick(String(body?.t ?? ''), request.headers.get('user-agent'));
  return NextResponse.json({ success: true });
}

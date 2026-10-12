import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { runCartReminders } from '@/lib/server/cartReminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Run by Vercel Cron every 5 minutes (vercel.json): sends the cart reminder to customers who left checkout about 30 minutes
 * ago (see lib/server/cartReminders.ts). Vercel sends "Authorization: Bearer <CRON_SECRET>"; otherwise only a logged-in admin
 * can call it. Does nothing unless CART_REMINDER is on (or dry, which only counts). Answers with counts, never addresses.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const isCron = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
  if (!isCron) {
    const denied = requireAdmin(request);
    if (denied) return denied;
  }
  try {
    return NextResponse.json({ success: true, data: await runCartReminders() });
  } catch (error) {
    console.error('[cart-reminders] run failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Cart reminders failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { runCompletionSync } from '@/lib/server/optimoRoute/completion';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Run by Vercel Cron every 5 minutes: reads what the drivers reported in OptimoRoute (on the way, delivered) so the customer's
 * "Out for delivery" and "Delivered" notifications go out within minutes instead of at the next 30-minute check. It is the same
 * step the 30-minute job runs (lib/server/optimoRoute/completion.ts), safe to repeat. Does nothing unless the completion switch is
 * on. Vercel sends "Authorization: Bearer <CRON_SECRET>"; otherwise only a logged-in admin can call it. Answers with counts.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const isCron = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
  if (!isCron) {
    const denied = requireAdmin(request);
    if (denied) return denied;
  }
  try {
    return NextResponse.json({ success: true, data: await runCompletionSync() });
  } catch (error) {
    console.error('[optimoroute-live] run failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Check failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { runDueCampaigns } from '@/lib/server/communications';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Run by Vercel Cron every 5 minutes (vercel.json): starts scheduled messages that are due and carries on with running ones (for
 * example texts that waited for 8 AM). Vercel sends "Authorization: Bearer <CRON_SECRET>"; otherwise only a logged-in admin can call it.
 * Answers with counts only.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const isCron = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
  if (!isCron) {
    const denied = requireAdmin(request);
    if (denied) return denied;
  }
  try {
    return NextResponse.json({ success: true, data: await runDueCampaigns() });
  } catch (error) {
    console.error('[communications] cron failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Communications run failed' }, { status: 500 });
  }
}

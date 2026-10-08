import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { reconcile } from '@/lib/server/optimoRoute/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Run by Vercel Cron every 30 minutes (vercel.json): sends any paid order whose delivery stop is missing and removes the
 * stops of cancelled or refunded orders. Vercel sends "Authorization: Bearer <CRON_SECRET>"; without the secret set
 * here, only a logged-in admin can call it. Does nothing unless OPTIMOROUTE_SYNC is on or dry.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const bearer = request.headers.get('authorization');
  const isCron = Boolean(secret) && bearer === `Bearer ${secret}`;
  if (!isCron) {
    const denied = requireAdmin(request);
    if (denied) return denied;
  }
  try {
    return NextResponse.json({ success: true, data: await reconcile() });
  } catch (error) {
    console.error('[optimoroute] reconcile failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Reconcile failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { reconcile } from '@/lib/server/optimoRoute/sync';
import { runAutoPlanning } from '@/lib/server/optimoRoute/planning';
import { runAutoDispatch } from '@/lib/server/optimoRoute/dispatch';
import { runCompletionSync } from '@/lib/server/optimoRoute/completion';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Run by Vercel Cron every 30 minutes (vercel.json): sends any paid order whose delivery stop is missing and removes the
 * stops of cancelled or refunded orders. Vercel sends "Authorization: Bearer <CRON_SECRET>"; without the secret set
 * here, only a logged-in admin can call it. Does nothing unless OPTIMOROUTE_SYNC is on or dry. It also plans tomorrow's
 * routes (see lib/server/optimoRoute/planning.ts) when OPTIMOROUTE_PLAN is on.
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
    const data = await reconcile();
    // after the stops are in OptimoRoute: plan tomorrow's routes when it is time (a no-op unless OPTIMOROUTE_PLAN is on or dry)
    const planning = await runAutoPlanning();
    // at 10:00 AM Pacific on the delivery day: send the routes to the drivers and notify the customers (a no-op unless OPTIMOROUTE_SEND is on or dry)
    const dispatch = await runAutoDispatch();
    // what the drivers finished: mark fully delivered orders Delivered (a no-op unless OPTIMOROUTE_COMPLETION is on or dry)
    const completion = await runCompletionSync();
    return NextResponse.json({ success: true, data, planning, dispatch, completion });
  } catch (error) {
    console.error('[optimoroute] reconcile failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Reconcile failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { backfillPartialDelivered } from '@/lib/server/optimoRoute/partialBackfill';
import { optimoMode } from '@/lib/server/optimoRoute/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/optimoroute/partial-backfill { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', dryRun?: boolean }  (admin only)
 * Moves orders that already have some delivery days done in OptimoRoute to Partially Delivered (see partialBackfill.ts).
 * A dry run (the default; send { "dryRun": false } to really write) only counts. Returns counts and order ids, no personal details.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  if (optimoMode() === 'off') return NextResponse.json({ success: false, error: 'OptimoRoute is not switched on for this site.' }, { status: 409 });
  let body: { from?: unknown; to?: unknown; dryRun?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // no body
  }
  const from = typeof body.from === 'string' ? body.from : '';
  const to = typeof body.to === 'string' ? body.to : '';
  try {
    const data = await backfillPartialDelivered(from, to, body.dryRun !== false);
    if (data.error) return NextResponse.json({ success: false, error: data.error, data }, { status: 400 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[partial-backfill] failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'The catch-up failed. Nothing that cannot be repeated was changed.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { optimoMode } from '@/lib/server/optimoRoute/config';
import { snapshotRoster } from '@/lib/server/optimoRoute/roster';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/admin/optimoroute/roster {date: 'YYYY-MM-DD'}: asks OptimoRoute for that day's drivers and stops now and keeps
 * the copy the Packing Report reads (the 30-minute job does the same for today and tomorrow). Read only towards OptimoRoute.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { date?: unknown } | null;
  const date = typeof body?.date === 'string' ? body.date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ success: false, error: 'date must be YYYY-MM-DD' }, { status: 400 });
  if (optimoMode() !== 'on') return NextResponse.json({ success: false, error: 'OptimoRoute is not switched on here' }, { status: 409 });
  const report = await snapshotRoster(date);
  if (report.action === 'error') return NextResponse.json({ success: false, error: report.error ?? 'Could not read the routes' }, { status: 502 });
  return NextResponse.json({ success: true, data: report });
}

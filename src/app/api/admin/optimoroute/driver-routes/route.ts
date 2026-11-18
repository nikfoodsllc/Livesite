import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { driverRoutes } from '@/lib/server/optimoRoute/driverRoutes';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 120;

/**
 * GET /api/admin/optimoroute/driver-routes?from=YYYY-MM-DD&to=YYYY-MM-DD (admins only): the planned routes of each day (driver,
 * planned minutes, number of stops) for the admin Dashboard's driver pay. Read only towards OptimoRoute; needs only the API key
 * (not the sync switch), so it works wherever the key is set.
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  if (!DAY.test(from) || !DAY.test(to) || from > to) return NextResponse.json({ success: false, error: 'from and to must be YYYY-MM-DD, from not after to' }, { status: 400 });
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  if (!(days > 0) || days > MAX_DAYS) return NextResponse.json({ success: false, error: `Pick at most ${MAX_DAYS} days` }, { status: 400 });
  try {
    const result = await driverRoutes(from, to);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: { routes: result.routes } });
  } catch (error) {
    console.error('[driver-routes]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Could not read the routes' }, { status: 500 });
  }
}

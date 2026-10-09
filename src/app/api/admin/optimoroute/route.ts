import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { optimoApiKey, optimoMode } from '@/lib/server/optimoRoute/config';
import { previewDate, reconcile, syncOrder } from '@/lib/server/optimoRoute/sync';
import { planDate, planMode, planRecord } from '@/lib/server/optimoRoute/planning';
import { dispatchRecord, sendMode } from '@/lib/server/optimoRoute/dispatch';
import { dispatchStatus } from '@/lib/server/optimoRoute/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET  /api/admin/optimoroute?date=YYYY-MM-DD   read-only: our paid orders for that day against what OptimoRoute has
 * POST /api/admin/optimoroute {orderIds: ['ORD-...']}   send (or retry) those orders' stops (honours OPTIMOROUTE_SYNC)
 * POST /api/admin/optimoroute {reconcile: true}         run the same pass as the 10-minute job now
 * POST /api/admin/optimoroute {plan: 'YYYY-MM-DD'}     plan that day's routes now (honours OPTIMOROUTE_PLAN; keeps routes already planned)
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const date = new URL(request.url).searchParams.get('date') ?? '';
  const mode = optimoMode();
  if (!date) return NextResponse.json({ success: true, mode, planMode: planMode(), sendMode: sendMode(), keySet: Boolean(optimoApiKey()) });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ success: false, error: 'date must be YYYY-MM-DD' }, { status: 400 });
  if (!optimoApiKey()) return NextResponse.json({ success: false, error: 'OPTIMOROUTE_API_KEY is not set' }, { status: 503 });
  const preview = await previewDate(date);
  if ('error' in preview) return NextResponse.json({ success: false, error: preview.error }, { status: 502 });
  return NextResponse.json({ success: true, mode, planMode: planMode(), data: preview, plan: await planRecord(date), dispatch: { record: await dispatchRecord(date), optimoroute: (await dispatchStatus(date)).data } });
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { orderIds?: unknown; reconcile?: unknown } | null;
  const mode = optimoMode();
  if (mode === 'off') return NextResponse.json({ success: false, error: 'OptimoRoute sync is switched off (OPTIMOROUTE_SYNC)' }, { status: 409 });
  const planDay = (body as { plan?: unknown } | null)?.plan;
  if (typeof planDay === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(planDay)) return NextResponse.json({ success: false, error: 'plan must be a date, YYYY-MM-DD' }, { status: 400 });
    if (planMode() === 'off') return NextResponse.json({ success: false, error: 'Automatic planning is switched off (OPTIMOROUTE_PLAN)' }, { status: 409 });
    return NextResponse.json({ success: true, planMode: planMode(), data: await planDate(planDay, { force: true }) });
  }
  if (body?.reconcile === true) return NextResponse.json({ success: true, mode, data: await reconcile() });
  const ids = Array.isArray(body?.orderIds) ? body!.orderIds.filter((x): x is string => typeof x === 'string' && /^[A-Za-z0-9-]{4,60}$/.test(x)) : [];
  if (ids.length === 0 || ids.length > 20) return NextResponse.json({ success: false, error: 'Send 1 to 20 order ids' }, { status: 400 });
  const results: Record<string, unknown> = {};
  for (const id of ids) results[id] = (await syncOrder(id)).outcomes;
  return NextResponse.json({ success: true, mode, data: results });
}

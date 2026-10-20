import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { notifyManualStatus } from '@/lib/server/push/manualStatus';

export const dynamic = 'force-dynamic';

/** POST { orderIds: ['ORD-...'], status: 'out_for_delivery' | 'delivered' }: the admin changed these orders by hand, tell the customers. */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { orderIds?: unknown; status?: unknown };
  const status = body.status === 'delivered' || body.status === 'out_for_delivery' ? body.status : null;
  const ids = Array.isArray(body.orderIds) ? [...new Set(body.orderIds.filter((v): v is string => typeof v === 'string' && /^ORD-[A-Za-z0-9]{6,40}$/.test(v)))] : [];
  if (!status) return NextResponse.json({ success: false, error: 'status must be out_for_delivery or delivered' }, { status: 400 });
  if (ids.length === 0 || ids.length > 100) return NextResponse.json({ success: false, error: 'Send 1 to 100 order ids' }, { status: 400 });
  const result = await notifyManualStatus(ids, status);
  return NextResponse.json({ success: true, data: result });
}

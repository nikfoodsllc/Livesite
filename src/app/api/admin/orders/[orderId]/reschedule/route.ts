import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { rescheduleOrder } from '@/lib/server/orderRescheduleService';
import { MAX_ITEMS_PER_MOVE, type ItemSelection } from '@/lib/orderReschedule';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/orders/{orderId}/reschedule  { items: [{ line, item }], newDate }
 * Moves the chosen items of a paid order to another DELIVERY date (the kitchen day stays) and updates the route
 * planner. The customer is told separately (reschedule-email).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const { orderId } = await params;

  let body: { items?: unknown; newDate?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? (body.items as ItemSelection[]) : [];
  if (items.length > MAX_ITEMS_PER_MOVE) return NextResponse.json({ success: false, error: 'Too many items.' }, { status: 400 });
  const newDate = typeof body.newDate === 'string' ? body.newDate : '';

  const result = await rescheduleOrder(decodeURIComponent(orderId), items, newDate, auth.adminId);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  const { ok: _ok, ...data } = result;
  void _ok;
  return NextResponse.json({ success: true, data });
}

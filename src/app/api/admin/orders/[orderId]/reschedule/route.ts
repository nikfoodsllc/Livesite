import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { rescheduleOrder } from '@/lib/server/orderRescheduleService';
import type { RescheduleInput } from '@/lib/orderReschedule';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/orders/{orderId}/reschedule  { changes: [{ index, newDate }] }
 * Moves day lines of a paid order to other delivery dates (kitchen day and delivery date together) and updates the
 * route planner. The customer is told separately (reschedule-email).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const { orderId } = await params;

  let body: { changes?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  const changes = Array.isArray(body.changes) ? (body.changes as RescheduleInput[]) : [];
  if (changes.length > 40) return NextResponse.json({ success: false, error: 'Too many changes.' }, { status: 400 });

  const result = await rescheduleOrder(decodeURIComponent(orderId), changes, auth.adminId);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  const { ok: _ok, ...data } = result;
  void _ok;
  return NextResponse.json({ success: true, data });
}

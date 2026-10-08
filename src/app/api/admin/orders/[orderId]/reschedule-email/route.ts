import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { sendRescheduleEmail } from '@/lib/server/orderRescheduleService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/orders/{orderId}/reschedule-email: emails the customer the new delivery dates of a moved order. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const { orderId } = await params;
  const result = await sendRescheduleEmail(decodeURIComponent(orderId), auth.adminId);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  const { ok: _ok, ...data } = result;
  void _ok;
  return NextResponse.json({ success: true, data });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { markOfflinePaid } from '@/lib/server/offlineOrderService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/offline-orders/{orderId}/mark-paid: the customer paid outside the website. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { orderId } = await params;
  let body: { method?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  if (body.method !== 'Cash on Delivery' && body.method !== 'Other') {
    return NextResponse.json({ success: false, error: 'Choose how it was paid' }, { status: 400 });
  }
  const result = await markOfflinePaid(decodeURIComponent(orderId), body.method, body.note);
  if (!result.ok) {
    const { status, ...rest } = result;
    return NextResponse.json({ success: false, ...rest }, { status });
  }
  return NextResponse.json({ success: true, data: { emailSent: result.emailSent } });
}

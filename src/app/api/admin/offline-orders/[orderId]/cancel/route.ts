import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { cancelOfflineOrder } from '@/lib/server/offlineOrderService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/offline-orders/{orderId}/cancel: cancel an order that is still waiting for the customer to pay its link. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const { orderId } = await params;
  const result = await cancelOfflineOrder(decodeURIComponent(orderId), auth.adminId);
  if (!result.ok) {
    const { status, ...rest } = result;
    return NextResponse.json({ success: false, ...rest }, { status });
  }
  return NextResponse.json({ success: true, data: { orderId: decodeURIComponent(orderId), cancelled: true } });
}

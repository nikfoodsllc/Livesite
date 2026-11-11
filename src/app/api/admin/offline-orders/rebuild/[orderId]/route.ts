import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getFailedOrderForRebuild } from '@/lib/server/offlineOrderService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/offline-orders/rebuild/{orderId}: a failed or unpaid website order, laid out for the Create Order form (to send the customer an offline order). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { orderId } = await params;
  const result = await getFailedOrderForRebuild(decodeURIComponent(orderId));
  if (!result.ok) {
    const { status, ...rest } = result;
    return NextResponse.json({ success: false, ...rest }, { status });
  }
  return NextResponse.json({ success: true, data: result.order });
}

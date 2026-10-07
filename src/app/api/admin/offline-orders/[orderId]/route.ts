import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getOrderForEdit } from '@/lib/server/offlineOrderService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/offline-orders/{orderId}: an order still waiting for payment, laid out for the Create Order form (edit). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { orderId } = await params;
  const result = await getOrderForEdit(decodeURIComponent(orderId));
  if (!result.ok) {
    const { status, ...rest } = result;
    return NextResponse.json({ success: false, ...rest }, { status });
  }
  return NextResponse.json({ success: true, data: result.order });
}

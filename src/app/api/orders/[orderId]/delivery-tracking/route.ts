import { NextRequest, NextResponse } from 'next/server';
import { userIdFrom } from '@/lib/server/push/auth';
import { deliveryTracking } from '@/lib/server/optimoRoute/trackingService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/{orderId}/delivery-tracking: where today's delivery stands (customer's own order only).
 * { state: none | later | today | on_the_way | delivered | not_delivered, date, etaFrom/etaTo (Pacific HH:MM), deliveredAt, trackingUrl }
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { orderId } = await params;
  if (!/^[A-Za-z0-9#-]{4,60}$/.test(orderId)) return NextResponse.json({ success: false, error: 'Invalid order' }, { status: 400 });
  const tracking = await deliveryTracking(orderId, userId);
  if (!tracking) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: tracking });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { previewOfflineOrder } from '@/lib/server/offlineOrderService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/offline-orders/preview: prices and totals an order without saving it. */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  let body: Parameters<typeof previewOfflineOrder>[0];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  try {
    const result = await previewOfflineOrder(body);
    if (!result.ok) {
      const { status, ...rest } = result;
      return NextResponse.json({ success: false, ...rest }, { status });
    }
    return NextResponse.json({ success: true, data: result.preview });
  } catch (error) {
    console.error('[offline-orders] preview failed', error);
    return NextResponse.json({ success: false, error: 'Could not price the order' }, { status: 500 });
  }
}

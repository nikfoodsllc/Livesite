import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { createOfflineOrder, OfflineOrderInput } from '@/lib/server/offlineOrderService';
import { siteFromHeaders } from '@/lib/server/stripePaymentInfo';

export const dynamic = 'force-dynamic';

/** POST /api/admin/offline-orders: an admin enters an order for a customer (pay by link, or already paid offline). */
export async function POST(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  let body: OfflineOrderInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
  try {
    const result = await createOfflineOrder(body, { adminId: auth.adminId, site: siteFromHeaders(request.headers) });
    if (!result.ok) {
      const { status, ...rest } = result;
      return NextResponse.json({ success: false, ...rest }, { status });
    }
    return NextResponse.json({ success: true, data: result.order });
  } catch (error) {
    console.error('[offline-orders] create failed', error);
    return NextResponse.json({ success: false, error: 'Something went wrong. Check the orders list before trying again.' }, { status: 500 });
  }
}

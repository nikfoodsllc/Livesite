import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { changeOrderAddress } from '@/lib/server/orderAddressService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/orders/{orderId}/address  { street, apartment, city, zipCode, entrance, floor }
 * Changes the delivery address of an order that has not been delivered or cancelled, and updates the route planner right away.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const { orderId } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  const result = await changeOrderAddress(decodeURIComponent(orderId), body, auth.adminId);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  const { ok: _ok, ...data } = result;
  void _ok;
  return NextResponse.json({ success: true, data });
}

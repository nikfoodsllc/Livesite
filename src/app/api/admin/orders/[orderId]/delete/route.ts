import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { deleteOrderAsAdmin } from '@/lib/server/orderDeletion';

export const dynamic = 'force-dynamic';

/** POST /api/admin/orders/{orderId}/delete: removes an order completely (any status). Admins only. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const { orderId } = await params;
  if (!/^[A-Za-z0-9-]{4,60}$/.test(orderId)) return NextResponse.json({ success: false, error: 'No order with that number' }, { status: 404 });
  try {
    const result = await deleteOrderAsAdmin(orderId, auth.adminId);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    const { ok: _ok, ...data } = result;
    void _ok;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[order-delete] failed', error);
    return NextResponse.json({ success: false, error: 'Something went wrong. Check the order before trying again.' }, { status: 500 });
  }
}

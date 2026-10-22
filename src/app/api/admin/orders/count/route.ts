import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { setCountedBeforePayment, type CountResult } from '@/lib/server/orderCountingService';

export const dynamic = 'force-dynamic';

const MAX_ORDERS = 50;

/**
 * POST /api/admin/orders/count  { orderIds: ['ORD-...'], count: boolean }
 * Counts unpaid orders in the Kitchen, Packing and Delivery reports (count true) or stops counting them (count false).
 * Each order is answered on its own: { results: [{ orderId, ok, reason?, unchanged? }] }.
 */
export async function POST(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  let body: { orderIds?: unknown; count?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  const ids = Array.isArray(body.orderIds) ? body.orderIds.filter((x): x is string => typeof x === 'string' && /^ORD-[0-9]+$/.test(x)) : [];
  const unique = Array.from(new Set(ids));
  if (unique.length === 0 || unique.length > MAX_ORDERS || typeof body.count !== 'boolean') {
    return NextResponse.json({ success: false, error: `Send 1 to ${MAX_ORDERS} order numbers and count true or false.` }, { status: 400 });
  }
  const results: CountResult[] = [];
  for (const orderId of unique) results.push(await setCountedBeforePayment(orderId, body.count, auth.adminId));
  return NextResponse.json({ success: true, data: { results } });
}

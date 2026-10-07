import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { searchCustomers } from '@/lib/server/offlineCustomer';

export const dynamic = 'force-dynamic';

/** GET /api/admin/offline-orders/customers?q=: customers whose email, name or phone matches. */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const q = new URL(request.url).searchParams.get('q') ?? '';
  try {
    return NextResponse.json({ success: true, data: await searchCustomers(q.slice(0, 80)) });
  } catch (error) {
    console.error('[offline-orders] customer search failed', error);
    return NextResponse.json({ success: false, error: 'Customer search failed' }, { status: 500 });
  }
}

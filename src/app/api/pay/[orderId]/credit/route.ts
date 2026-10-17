import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { Order } from '@/types/order';
import { paymentTokenMatches } from '@/lib/server/paymentLink';
import { applyCreditToLinkOrder, payLinkOrderWithCredit, releaseCreditFromLinkOrder } from '@/lib/server/linkOrderCredit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pay/{orderId}/credit?t=<secret>  { action: 'use' | 'release' | 'pay' }
 * The customer's store credit on the pay page: use it (the card payment shrinks), switch it off again, or, when it
 * covers the whole order, pay with it. The secret from the emailed link is the only thing that opens this.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const id = decodeURIComponent(orderId);
  const token = new URL(request.url).searchParams.get('t');
  const found = await db.readOne<Order>('orders', { orderId: id, source: 'admin' } as never);
  const order = found.success ? found.data : null;
  if (!order || !paymentTokenMatches(token, order.paymentLinkTokenHash)) {
    return NextResponse.json({ success: false, error: 'This payment link is not valid.' }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  const result =
    action === 'use' ? await applyCreditToLinkOrder(id) : action === 'release' ? await releaseCreditFromLinkOrder(id) : action === 'pay' ? await payLinkOrderWithCredit(id) : null;
  if (!result) return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  return NextResponse.json({ success: true, data: { used: result.used, covered: result.covered } });
}

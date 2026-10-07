import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { Order } from '@/types/order';
import { paymentTokenMatches } from '@/lib/server/paymentLink';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pay/{orderId}/check?t=<secret>: asked by the pay page right before the card is charged, like the
 * website's checkout asks when Pay is pressed. Orders entered by an admin are exempt from the cutoff, so it only
 * confirms that the link is still valid.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = new URL(request.url).searchParams.get('t');
  const found = await db.readOne<Order>('orders', { orderId: decodeURIComponent(orderId), source: 'admin' } as never);
  const order = found.success ? found.data : null;
  if (!order || !paymentTokenMatches(token, order.paymentLinkTokenHash)) {
    return NextResponse.json({ success: false, error: 'This payment link is not valid.' }, { status: 404 });
  }
  // admin-entered orders are not subject to the order cutoff (master tool), so there is nothing to refuse here
  return NextResponse.json({ success: true });
}

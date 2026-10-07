import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { Order } from '@/types/order';
import { paymentTokenMatches } from '@/lib/server/paymentLink';
import { recordPaymentLinkView } from '@/lib/server/paymentLinkTracking';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pay/{orderId}/seen?t=<secret>: called by the pay page once it has rendered in the customer's browser, so the
 * admin can see that the link was really opened (link scanners only fetch the link and never run the page). Answers like
 * the other pay routes: a wrong link is a plain 404, a right one always {success: true}, counted or not.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = new URL(request.url).searchParams.get('t');
  const id = decodeURIComponent(orderId);
  const found = await db.readOne<Order>('orders', { orderId: id, source: 'admin' } as never);
  const order = found.success ? found.data : null;
  if (!order || !paymentTokenMatches(token, order.paymentLinkTokenHash)) {
    return NextResponse.json({ success: false, error: 'This payment link is not valid.' }, { status: 404 });
  }
  await recordPaymentLinkView(order.orderId, request.headers.get('user-agent'));
  return NextResponse.json({ success: true });
}

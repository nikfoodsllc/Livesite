import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { Order } from '@/types/order';
import { paymentTokenMatches } from '@/lib/server/paymentLink';
import { findClosedLines } from '@/lib/server/availableDates';
import { closedLinesMessage } from '@/lib/server/orderCutoff';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pay/{orderId}/check?t=<secret>: asked by the pay page right before the card is charged, like the
 * website's checkout asks when Pay is pressed. If a delivery day of the order has closed since the page was opened,
 * the answer is 409 and the page does not take the payment.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = new URL(request.url).searchParams.get('t');
  const found = await db.readOne<Order>('orders', { orderId: decodeURIComponent(orderId), source: 'admin' } as never);
  const order = found.success ? found.data : null;
  if (!order || !paymentTokenMatches(token, order.paymentLinkTokenHash)) {
    return NextResponse.json({ success: false, error: 'This payment link is not valid.' }, { status: 404 });
  }
  const closed = await findClosedLines(
    order.items.flatMap((day) =>
      day.items.map((it) => ({
        date: day.deliveryDate instanceof Date ? day.deliveryDate.toISOString().slice(0, 10) : String(day.deliveryDate).slice(0, 10),
        foodItemId: it.food._id,
        name: it.food.name,
        kind: it.listingType,
      }))
    )
  );
  if (closed.length > 0) {
    return NextResponse.json({ success: false, code: 'ORDER_CUTOFF_CLOSED', error: closedLinesMessage(closed) }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}

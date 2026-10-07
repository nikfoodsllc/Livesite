import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/server/db';
import { Order, OrderDay } from '@/types/order';
import { paymentTokenMatches } from '@/lib/server/paymentLink';
import { findClosedDeliveryDates } from '@/lib/server/availableDates';
import { closedDatesMessage } from '@/lib/server/orderCutoff';

export const dynamic = 'force-dynamic';

interface PayItem {
  name: string;
  quantity: number;
  price: number;
  portion?: string;
  spice?: string;
  eco?: boolean;
  /** One line per chosen combo part: "Veg Curry of the Day: Kale Chane (12Oz)" */
  combo: string[];
}

function toPayItem(it: OrderDay['items'][number]): PayItem {
  const combo: string[] = [];
  for (const [sectionId, ids] of Object.entries(it.comboSelections ?? {})) {
    const section = it.food.sections?.find((s) => s._id === sectionId);
    if (!section) continue;
    for (const id of ids) {
      const chosen = section.selectedItems.find((o) => o._id === id);
      if (chosen) combo.push(`${section.title}: ${chosen.item.name}${chosen.portion ? ` (${chosen.portion})` : ''}`);
    }
  }
  return { name: it.food.name, quantity: it.quantity, price: it.price, portion: it.selectedPortion, spice: it.spiceLevel, eco: it.isEcoFriendlyContainer, combo };
}

/**
 * GET /api/pay/{orderId}?t=<secret>: what the customer's pay page needs. The secret from the emailed link is the only
 * thing that opens this; with a wrong or missing one the answer is always the same 404, so order numbers cannot be probed.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = new URL(request.url).searchParams.get('t');
  const notFound = () => NextResponse.json({ success: false, error: 'This payment link is not valid.' }, { status: 404 });

  const found = await db.readOne<Order>('orders', { orderId: decodeURIComponent(orderId), source: 'admin' } as never);
  const order = found.success ? found.data : null;
  if (!order) return notFound();

  if (!paymentTokenMatches(token, order.paymentLinkTokenHash)) return notFound();

  if (order.paymentStatus === 'paid') {
    return NextResponse.json({ success: true, data: { state: 'paid', orderId: order.orderId, firstName: order.customerInfo.name.split(/\s+/)[0] } });
  }

  if (order.status === 'cancelled' || order.paymentStatus === 'refunded' || !order.stripePaymentIntentId) {
    return NextResponse.json({ success: true, data: { state: 'closed', orderId: order.orderId } });
  }

  // same rule as the website's checkout: a delivery day that has closed since the order was entered cannot be paid for
  const closed = await findClosedDeliveryDates(order.items.map((day) => day.deliveryDate));
  if (closed.length > 0) {
    return NextResponse.json({ success: true, data: { state: 'cutoff', orderId: order.orderId, message: closedDatesMessage(closed) } });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ success: false, error: 'Payments are not available right now.' }, { status: 503 });
  try {
    const stripe = new Stripe(key, { apiVersion: '2025-10-29.clover' });
    const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (pi.status === 'succeeded') {
      return NextResponse.json({ success: true, data: { state: 'paid', orderId: order.orderId, firstName: order.customerInfo.name.split(/\s+/)[0] } });
    }
    if (pi.status === 'canceled') return NextResponse.json({ success: true, data: { state: 'closed', orderId: order.orderId } });
    return NextResponse.json({
      success: true,
      data: {
        state: 'pay',
        orderId: order.orderId,
        clientSecret: pi.client_secret,
        currency: order.currency,
        customer: { name: order.customerInfo.name, email: order.customerInfo.email, phone: order.customerInfo.phone },
        subtotal: order.subtotal,
        platformFee: order.platformFee,
        deliveryFee: order.deliveryFee,
        tax: order.taxes,
        tip: order.tip,
        discount: order.discount?.amount ?? 0,
        discountCode: order.discount?.code,
        total: order.totalPaid,
        // grouped by the day it is delivered (an item picked for an earlier day but combined into a later delivery sits with it)
        days: Object.entries(
          order.items.reduce<Record<string, PayItem[]>>((acc, day) => {
            const when = String(day.actualDeliveryDate ?? day.deliveryDate).slice(0, 10);
            acc[when] = [...(acc[when] ?? []), ...day.items.map(toPayItem)];
            return acc;
          }, {})
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, items]) => ({ date, items, dayTotal: Number(items.reduce((sum, it) => sum + it.price * it.quantity, 0).toFixed(2)) })),
      },
    });
  } catch (error) {
    console.error('[pay] could not open the payment', { orderId: order.orderId, message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Could not load the payment. Please try again.' }, { status: 502 });
  }
}

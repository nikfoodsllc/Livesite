import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/server/db';
import { Order, OrderDay } from '@/types/order';
import { paymentTokenMatches } from '@/lib/server/paymentLink';
import { cleanInstructions } from '@/lib/server/deliveryInstructions';
import { validateZipcodeServiceabilityServer } from '@/utils/zipcodeValidation';

export const dynamic = 'force-dynamic';

interface PayItem {
  name: string;
  quantity: number;
  price: number;
  portion?: string;
  spice?: string;
  eco?: boolean;
  notes?: string;
  /** One entry per combo section: { title: 'Veg Curry of the Day', choices: ['Kale Chane (12Oz)'] } */
  combo: Array<{ title: string; choices: string[] }>;
}

function toPayItem(it: OrderDay['items'][number]): PayItem {
  const combo: PayItem['combo'] = [];
  for (const section of it.food.sections ?? []) {
    const choices = (it.comboSelections?.[section._id] ?? [])
      .map((id) => section.selectedItems.find((o) => o._id === id))
      .filter((o): o is NonNullable<typeof o> => !!o?.item?.name)
      .map((o) => `${o.item.name}${o.portion ? ` (${o.portion})` : ''}`);
    if (choices.length > 0) combo.push({ title: section.title, choices });
  }
  return { name: it.food.name, quantity: it.quantity, price: it.price, portion: it.selectedPortion, spice: it.spiceLevel, eco: it.isEcoFriendlyContainer, notes: it.notes, combo };
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

  // Create Order is the admin's master tool: no cutoff applies, a delivery day that has closed since the order was entered can still be paid for

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
        // one entry per menu day (the day the items were picked for) with the date it is delivered on
        days: [...order.items]
          .sort((a, b) => String(a.deliveryDate).localeCompare(String(b.deliveryDate)))
          .map((day) => {
            const items = day.items.map(toPayItem);
            return {
              day: day.day,
              date: String(day.deliveryDate).slice(0, 10),
              deliverOn: String(day.actualDeliveryDate ?? day.deliveryDate).slice(0, 10),
              items,
              dayTotal: Number((day.dayTotal ?? items.reduce((sum, it) => sum + it.price * it.quantity, 0)).toFixed(2)),
            };
          }),
        address: {
          street: order.address.street,
          apartment: order.address.apartment,
          city: order.address.city,
          state: order.address.state,
          zip: order.address.zipCode,
          entrance: order.address.entrance,
          floor: order.address.floor,
          landmark: order.address.landmark,
        },
      },
    });
  } catch (error) {
    console.error('[pay] could not open the payment', { orderId: order.orderId, message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Could not load the payment. Please try again.' }, { status: 502 });
  }
}

/**
 * PATCH /api/pay/{orderId}?t=<secret>
 * Body: { street, apartment?, city, zip, entrance?, floor? } (floor = delivery instructions)
 * The customer corrects the delivery address of the order they are about to pay for. Same secret as the page. Only an order
 * that is not paid, cancelled or closed. A changed zip code must be one we deliver to (the admin's own entry is not
 * restricted, but a customer picking a new zip is). Nothing else on the order is touched.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = new URL(request.url).searchParams.get('t');
  const notFound = () => NextResponse.json({ success: false, error: 'This payment link is not valid.' }, { status: 404 });

  const found = await db.readOne<Order>('orders', { orderId: decodeURIComponent(orderId), source: 'admin' } as never);
  const order = found.success ? found.data : null;
  if (!order || !paymentTokenMatches(token, order.paymentLinkTokenHash)) return notFound();
  if (order.paymentStatus === 'paid' || order.status === 'cancelled' || order.paymentStatus === 'refunded') {
    return NextResponse.json({ success: false, error: 'This order can no longer be changed.' }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const text = (key: string) => (typeof body?.[key] === 'string' ? (body[key] as string).replace(/\s+/g, ' ').trim() : '');
  const street = text('street');
  const apartment = text('apartment');
  const city = text('city');
  const zip = text('zip');
  const entrance = text('entrance');
  const floor = cleanInstructions(body?.floor) ?? '';

  const bad = (error: string) => NextResponse.json({ success: false, error }, { status: 400 });
  if (street.length < 5 || street.length > 150) return bad('Enter the street address.');
  if (city.length < 2 || city.length > 60) return bad('Enter the city.');
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return bad('Enter a 5 digit zip code.');
  if (apartment.length > 10) return bad('The apartment can be at most 10 characters.');
  if (entrance.length > 20) return bad('The gate code can be at most 20 characters.');

  const oldZip = String(order.address?.zipCode ?? '').slice(0, 5);
  if (zip.slice(0, 5) !== oldZip) {
    const area = await validateZipcodeServiceabilityServer(zip.slice(0, 5), db);
    if (!area.isServiceable) return bad(area.message || "We don't deliver to that zip code yet.");
  }

  const set: Record<string, unknown> = { 'address.street': street, 'address.city': city, 'address.zipCode': zip, updatedAt: new Date() };
  const unset: Record<string, ''> = {};
  for (const [field, value] of [['apartment', apartment], ['entrance', entrance], ['floor', floor]] as const) {
    if (value) set[`address.${field}`] = value;
    else unset[`address.${field}`] = '';
  }
  const saved = await db.updateOne('orders', { orderId: order.orderId, source: 'admin' } as never, (Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set }) as never);
  if (!saved.success) return NextResponse.json({ success: false, error: 'Could not save. Please try again.' }, { status: 500 });
  return NextResponse.json({ success: true });
}

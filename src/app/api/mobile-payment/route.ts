import { NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const {
      amount,
      customerEmail,
      customerName,
      customerPhone,
      deliveryAddress,
      notes,
      items
    } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      receipt_email: customerEmail,
      description: `NikFoods mobile order from ${customerName}`,
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: 'ios_app',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        deliveryAddress: deliveryAddress || '',
        notes: notes || '',
        itemCount: items?.length?.toString() || '0',
        itemSummary: items
          ?.map((i: any) => `${i.quantity}x ${i.name}`)
          .join(', ')
          .substring(0, 490) || '',
      },
    });

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Mobile payment error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment' },
      { status: 500 }
    );
  }
}

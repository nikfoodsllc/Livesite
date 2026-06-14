import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { Cart } from '@/types/cart';
import { calculateTipAmount } from '@/lib/orderHelpers';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not configured in environment variables');
}

const stripe = new Stripe(stripeSecretKey || 'sk_test_dummy_key_for_build', {
  apiVersion: '2025-10-29.clover',
});

interface PaymentIntentRequest {
  cart: Cart;
  tipPercentage: number;
  currency?: string;
  paymentIntentId?: string;
}

function calculateCheckoutTotal(cart: Cart, tipPercentage: number): number {
  const tipAmount = calculateTipAmount(cart.subtotal, tipPercentage);
  const discount = cart.appliedCoupon?.discountAmount || 0;
  return Number(
    (
      cart.subtotal +
      cart.platformFee +
      cart.deliveryFee +
      cart.tax +
      tipAmount -
      discount
    ).toFixed(2)
  );
}

/**
 * POST /api/checkout/payment-intent
 * Creates or updates a Stripe PaymentIntent from cart totals only (no order yet).
 * Used to show the Payment Element immediately on checkout.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const verifyResult = jwtHandler.verifyToken(token);

    if (!verifyResult.success || !verifyResult.payload) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = verifyResult.payload.userId;
    const body: PaymentIntentRequest = await request.json();
    const { cart, tipPercentage, currency, paymentIntentId } = body;

    if (!cart || !cart.days || cart.days.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    if (!cart.canCheckout) {
      return NextResponse.json(
        { success: false, error: 'Cart does not meet minimum order requirements' },
        { status: 400 }
      );
    }

    if (!stripeSecretKey || stripeSecretKey === 'sk_test_dummy_key_for_build') {
      return NextResponse.json(
        { success: false, error: 'Stripe is not properly configured' },
        { status: 500 }
      );
    }

    const totalPaid = calculateCheckoutTotal(cart, tipPercentage ?? 0);
    const amountCents = Math.round(totalPaid * 100);

    if (amountCents <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid order total' }, { status: 400 });
    }

    if (paymentIntentId) {
      try {
        const updated = await stripe.paymentIntents.update(paymentIntentId, {
          amount: amountCents,
          currency: currency || 'usd',
        });

        return NextResponse.json({
          success: true,
          data: {
            clientSecret: updated.client_secret,
            paymentIntentId: updated.id,
            totalAmount: totalPaid,
          },
        });
      } catch (updateError) {
        console.warn('Failed to update PaymentIntent, creating a new one:', updateError);
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency || 'usd',
      payment_method_types: ['card'],
      metadata: {
        userId,
        checkoutDraft: 'true',
      },
      description: 'NikFoods checkout',
    });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        totalAmount: totalPaid,
      },
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      },
      { status: 500 }
    );
  }
}

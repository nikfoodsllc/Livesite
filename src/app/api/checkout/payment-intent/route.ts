import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { Cart } from '@/types/cart';
import { MAX_TIP_AMOUNT, parseCustomTip, resolveTipAmount } from '@/lib/orderHelpers';
import Stripe from 'stripe';
import { ObjectId, type Filter } from 'mongodb';
import { db } from '@/lib/server/db';
import type { IUser } from '@/types/auth';
import { buildDraftPaymentMetadata, siteFromHeaders } from '@/lib/server/stripePaymentInfo';
import { findClosedLines } from '@/lib/server/availableDates';
import { closedLinesMessage, legacyClosedDates } from '@/lib/server/orderCutoff';
import { saveCheckoutDraft } from '@/lib/server/checkoutDrafts';
import { creditForCheckout } from '@/lib/server/checkoutCredit';
import { toDollars } from '@/lib/storeCredit';

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
  /** A tip typed in dollars; used instead of the percentage when present */
  tipAmount?: number;
  currency?: string;
  paymentIntentId?: string;
  /** Pay with the customer's store credit first */
  useStoreCredit?: boolean;
  /** The order already created for this payment (a retry): it keeps the credit it was created with */
  orderId?: string;
}

function calculateCheckoutTotal(cart: Cart, tipPercentage: number, customTip?: number): number {
  const tipAmount = resolveTipAmount(cart.subtotal, tipPercentage, customTip);
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

/** Email/phone of the signed-in customer, so a draft payment can be traced to a person in Stripe. */
async function lookupCustomer(userId: string): Promise<{ name?: string; email?: string; phone?: string }> {
  try {
    const result = await db.readOne<IUser>('users', {
      _id: new ObjectId(userId),
    } as unknown as Filter<IUser>);
    return { name: result.data?.name, email: result.data?.email, phone: result.data?.phone };
  } catch (error) {
    console.warn('[payment-intent] Could not look up the customer for Stripe metadata:', error);
    return {};
  }
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
    const useStoreCredit = body.useStoreCredit === true;
    const pendingOrderId = typeof body.orderId === 'string' ? body.orderId : undefined;

    if (!cart || !cart.days || cart.days.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    if (body.tipAmount !== undefined && body.tipAmount !== null && parseCustomTip(body.tipAmount) === null) {
      return NextResponse.json({ success: false, error: `The tip must be from $0 to $${MAX_TIP_AMOUNT}` }, { status: 400 });
    }

    if (!cart.canCheckout) {
      return NextResponse.json(
        { success: false, error: 'Cart does not meet minimum order requirements' },
        { status: 400 }
      );
    }

    // Refuse days ordering has closed for (same rule as the menu, including a custom cutoff set by an
    // admin), so an old page or a stale cart cannot order a closed day
    const closedItems = await findClosedLines(
      cart.days.flatMap((day) => day.items.map((item) => ({ date: day.date, foodItemId: item.foodItem?._id, name: item.foodItem?.name, kind: item.listingType })))
    );
    if (closedItems.length > 0) {
      return NextResponse.json(
        { success: false, error: closedLinesMessage(closedItems), code: 'ORDER_CUTOFF_CLOSED', closedItems, closedDates: legacyClosedDates(closedItems) },
        { status: 409 }
      );
    }

    if (Math.round(calculateCheckoutTotal(cart, tipPercentage ?? 0, body.tipAmount) * 100) <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid order total' }, { status: 400 });
    }

    // store credit pays first; the card is only asked for what is left, and the Platform Fee follows the card part only
    const credit = await creditForCheckout({
      userId,
      cart,
      tipAmount: resolveTipAmount(cart.subtotal, tipPercentage ?? 0, body.tipAmount),
      discount: cart.appliedCoupon?.discountAmount || 0,
      useStoreCredit,
      orderId: pendingOrderId,
    });
    const totalPaid = credit.total;
    const amountCents = credit.cardCents;
    const creditApplied = toDollars(credit.creditCents);
    const creditFields = { creditApplied, cardAmount: toDollars(credit.cardCents), balance: toDollars(credit.balanceCents), platformFee: credit.platformFee, tax: credit.tax, total: credit.total };

    if (amountCents <= 0) {
      // the credit pays for everything: there is no card payment. An earlier card session for this checkout is closed.
      if (paymentIntentId) {
        try {
          await stripe.paymentIntents.cancel(paymentIntentId);
        } catch (cancelError) {
          console.warn('[payment-intent] could not close the card session that store credit made unnecessary', cancelError instanceof Error ? cancelError.message : cancelError);
        }
      }
      return NextResponse.json({ success: true, data: { coveredByCredit: true, totalAmount: totalPaid, ...creditFields } });
    }

    // only a card payment needs Stripe: an order the store credit pays in full does not
    if (!stripeSecretKey || stripeSecretKey === 'sk_test_dummy_key_for_build') {
      return NextResponse.json(
        { success: false, error: 'Stripe is not properly configured' },
        { status: 500 }
      );
    }

    const customer = await lookupCustomer(userId);
    const metadata = buildDraftPaymentMetadata({
      userId,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      cart,
      totalPaid,
      site: siteFromHeaders(request.headers),
    });
    // an empty value clears the key in Stripe when the customer turned the credit off after it was set
    metadata.storeCreditUsed = credit.creditCents > 0 ? creditApplied.toFixed(2) : '';

    if (paymentIntentId) {
      try {
        const updated = await stripe.paymentIntents.update(paymentIntentId, {
          amount: amountCents,
          currency: currency || 'usd',
          metadata,
        });

        // remember the cart so a customer who never finishes can be followed up (never blocks the payment)
        await saveCheckoutDraft({ paymentIntentId: updated.id, userId, customer, cart, total: totalPaid });

        return NextResponse.json({
          success: true,
          data: {
            clientSecret: updated.client_secret,
            paymentIntentId: updated.id,
            totalAmount: totalPaid,
            ...creditFields,
          },
        });
      } catch (updateError) {
        console.warn('Failed to update PaymentIntent, creating a new one:', {
          paymentIntentId,
          userId,
          error: updateError instanceof Error ? updateError.message : updateError,
        });
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency || 'usd',
      payment_method_types: ['card'],
      metadata,
      description: customer.email ? `NikFoods checkout (${customer.email})` : 'NikFoods checkout',
    });

    await saveCheckoutDraft({ paymentIntentId: paymentIntent.id, userId, customer, cart, total: totalPaid });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        totalAmount: totalPaid,
        ...creditFields,
      },
    });
  } catch (error) {
    console.error('Payment intent error:', {
      message: error instanceof Error ? error.message : String(error),
      stripeCode: (error as { code?: string })?.code,
      stripeType: (error as { type?: string })?.type,
      requestId: (error as { requestId?: string })?.requestId,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      },
      { status: 500 }
    );
  }
}

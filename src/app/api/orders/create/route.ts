import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { Cart } from '@/types/cart';
import { Order, PaymentMethod } from '@/types/order';
import {
  generateOrderId,
  convertCartToOrderItems,
  createAddressSnapshot,
  createCustomerInfo,
  MAX_TIP_AMOUNT,
  parseCustomTip,
  resolveTipAmount,
  formatOrderForDatabase,
} from '@/lib/orderHelpers';
import { calculateDeliveryDates } from '@/lib/deliveryCalculator';
import { DEFAULT_MIN_CART_VALUE } from '@/lib/cartLogic';
import Stripe from 'stripe';
import { buildOrderPaymentMetadata, buildOrderDescription, siteFromHeaders } from '@/lib/server/stripePaymentInfo';
import { findClosedLines } from '@/lib/server/availableDates';
import { closedLinesMessage, legacyClosedDates } from '@/lib/server/orderCutoff';
import { attachOrderToDraft } from '@/lib/server/checkoutDrafts';
import { rememberUserPhone } from '@/lib/server/userPhone';
import { cleanInstructions, saveInstructionsOnAddress } from '@/lib/server/deliveryInstructions';
import { sendWelcomeText, setSmsConsent } from '@/lib/server/smsService';
import { creditForCheckout } from '@/lib/server/checkoutCredit';
import { addCredit, spendCredit } from '@/lib/server/storeCredit';
import { toDollars } from '@/lib/storeCredit';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { syncOrderSafely } from '@/lib/server/optimoRoute/sync';
import { clearUserCartSafely } from '@/lib/server/userCart';
import { markDraftConverted } from '@/lib/server/checkoutDrafts';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not configured in environment variables');
}

const stripe = new Stripe(stripeSecretKey || 'sk_test_dummy_key_for_build', {
  apiVersion: '2025-10-29.clover',
});

interface CreateOrderRequest {
  cart: Cart;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  tipPercentage: number;
  /** A tip typed in dollars; used instead of the percentage when present */
  tipAmount?: number;
  paymentMethod: PaymentMethod;
  currency: string;
  /** Reuse PaymentIntent created at checkout load (inline payment form) */
  paymentIntentId?: string;
  /** Delivery instructions typed at checkout: go on this order and are saved on the selected address */
  deliveryInstructions?: string;
  /** The text-message box at checkout: true = agree to order texts for this phone, false = stop them, absent = leave as is */
  smsOptIn?: boolean;
  /** Pay with the customer's store credit first (the server works out how much) */
  useStoreCredit?: boolean;
}

/**
 * Fetches zipcode configuration from database
 * @param zipcode - The zipcode to look up
 * @returns Zipcode configuration with minCartValue or null if not found
 */
async function getZipcodeConfigFromDb(zipcode: string): Promise<{ minCartValue?: number } | null> {
  const result = await db.readOne('zincodes', { zipcode });
  if (result.success && result.data) {
    return {
      minCartValue: result.data.minCartValue,
    };
  }
  return null;
}

/**
 * POST /api/orders/create
 * Creates a new order with either COD or Credit Card payment
 *
 * Date Format Standard:
 * - All Date objects (createdAt, updatedAt) are stored as Date objects in the database
 * - NextResponse.json() will serialize them to ISO 8601 format when returned in API responses
 * - formatOrderForDatabase() helper ensures Date objects are properly set
 */
export async function POST(request: NextRequest) {
  // store credit taken off the balance for this order; handed back if the order cannot be saved
  let reservedCredit: { userId: string; cents: number; orderId: string } | null = null;
  const giveBackCredit = async () => {
    if (!reservedCredit) return;
    const held = reservedCredit;
    reservedCredit = null;
    try {
      await addCredit({ userId: held.userId, cents: held.cents, type: 'restored', orderId: held.orderId, reason: 'The order was not placed' });
    } catch (creditError) {
      console.error('[store-credit] could not hand the credit back after a failed order', { orderId: held.orderId, message: creditError instanceof Error ? creditError.message : String(creditError) });
    }
  };
  try {
    // Verify authentication
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

    // Parse request body
    const body: CreateOrderRequest = await request.json();
    const { cart, customerInfo, tipPercentage, paymentMethod, currency, paymentIntentId } = body;

    // Validate required fields
    if (!cart || !cart.days || cart.days.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400 }
      );
    }

    if (!cart.selectedAddress) {
      return NextResponse.json(
        { success: false, error: 'Delivery address is required' },
        { status: 400 }
      );
    }

    // Validate that address is complete (not zipcode-derived or placeholder)
    const selectedAddress = cart.selectedAddress;
    const isZipcodeAddress = selectedAddress._id?.startsWith('zipcode-');
    const hasPlaceholderAddress = selectedAddress.addressLine1 === 'Delivery Area' ||
                                  selectedAddress.addressLine1 === 'Delivery Area:';

    if (isZipcodeAddress || hasPlaceholderAddress) {
      return NextResponse.json(
        { success: false, error: 'Complete delivery address including street address is required' },
        { status: 400 }
      );
    }

    if (!customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      return NextResponse.json(
        { success: false, error: 'Customer information is required' },
        { status: 400 }
      );
    }

    // Validate cart can checkout
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

    // Generate order ID
    const orderId = generateOrderId();

    // Calculate delivery dates based on location-specific minimum order value
    const zipcode = cart.selectedAddress?.zipCode;
    let minOrderValue = DEFAULT_MIN_CART_VALUE;

    if (zipcode) {
      const zipcodeConfig = await getZipcodeConfigFromDb(zipcode);
      minOrderValue = zipcodeConfig?.minCartValue || DEFAULT_MIN_CART_VALUE;
    }

    const deliveryCalculationResults = calculateDeliveryDates(cart.days, minOrderValue);

    // Convert cart to order items with delivery date calculations
    const orderItems = convertCartToOrderItems(cart.days, deliveryCalculationResults);

    // Create address snapshot
    const addressSnapshot = createAddressSnapshot(cart.selectedAddress);
    // instructions typed at checkout win over the ones saved on the address (an empty text clears them)
    const instructions = cleanInstructions(body.deliveryInstructions);
    if (instructions !== undefined) addressSnapshot.floor = instructions || undefined;

    // Create customer info
    const customer = createCustomerInfo(
      customerInfo.name,
      customerInfo.email,
      customerInfo.phone
    );

    // Calculate tip amount
    if (body.tipAmount !== undefined && body.tipAmount !== null && parseCustomTip(body.tipAmount) === null) {
      return NextResponse.json({ success: false, error: `The tip must be from $0 to $${MAX_TIP_AMOUNT}` }, { status: 400 });
    }
    const tipAmount = resolveTipAmount(cart.subtotal, tipPercentage, body.tipAmount);

    // Calculate total (cart already has calculated values)
    const discount = cart.appliedCoupon?.discountAmount || 0;

    // Store credit pays first. It is taken off the balance right now (one atomic update that only works while the balance
    // covers it), so a second checkout at the same moment cannot spend it again.
    const credit = await creditForCheckout({
      userId,
      cart,
      tipAmount,
      discount,
      useStoreCredit: body.useStoreCredit === true,
    });
    // with credit the Platform Fee (and the tax on it) follow only the part that goes through the card
    const totalPaid = credit.total;
    if (credit.creditCents > 0) {
      const taken = await spendCredit({ userId, cents: credit.creditCents, orderId, reason: `Order ${orderId}` });
      if (!taken) {
        return NextResponse.json(
          { success: false, error: 'Your store credit changed. Please check the total and try again.', code: 'CREDIT_CHANGED' },
          { status: 409 }
        );
      }
      reservedCredit = { userId, cents: credit.creditCents, orderId };
    }
    const paidByCreditOnly = credit.creditCents > 0 && credit.cardCents === 0;

    // Extract delivery messages from cart
    const deliveryMessages = cart.days
      .filter((day) => day.deliveryMessage)
      .map((day) => day.deliveryMessage!.message);

    // Create base order object
    const order: Omit<Order, '_id'> = {
      orderId,
      user: userId,
      items: orderItems,
      address: addressSnapshot,
      customerInfo: customer,
      subtotal: cart.subtotal,
      platformFee: credit.platformFee,
      deliveryFee: cart.deliveryFee,
      taxes: credit.tax,
      tip: tipAmount,
      discount: cart.appliedCoupon
        ? {
            amount: cart.appliedCoupon.discountAmount,
            code: cart.appliedCoupon.code,
          }
        : undefined,
      minOrderValue,
      totalPaid: Number(totalPaid.toFixed(2)),
      currency: currency || 'usd',
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: paidByCreditOnly ? 'Store Credit' : paymentMethod,
      deliveryMessages,
      // the iPhone app says who it is in this header; the website sends none
      channel: request.headers.get('x-nikfoods-client') === 'ios' ? ('mobile' as const) : ('web' as const),
      ...(credit.creditCents > 0
        ? {
            storeCreditUsed: toDollars(credit.creditCents),
            storeCreditState: paidByCreditOnly ? ('applied' as const) : ('held' as const),
          }
        : {}),
      ...(paidByCreditOnly ? { paidAt: new Date() } : {}),
    };

    // The credit pays for the whole order: no card payment. The order is saved as paid, like the webhook does for a card.
    if (paidByCreditOnly) {
      const paidOrder: Omit<Order, '_id'> = { ...order, status: 'confirmed', paymentStatus: 'paid' };
      const saved = await db.create('orders', formatOrderForDatabase(paidOrder as Order));
      if (!saved.success) {
        console.error('Failed to create the order paid by store credit:', { orderId, userId, error: saved.error });
        await giveBackCredit();
        return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
      }
      reservedCredit = null; // the order owns the credit now

      // an earlier card session of this checkout is no longer needed (best effort)
      if (paymentIntentId) {
        try {
          await stripe.paymentIntents.cancel(paymentIntentId);
        } catch (cancelError) {
          console.warn('[orders/create] could not close the card session after paying with store credit', cancelError instanceof Error ? cancelError.message : cancelError);
        }
        await markDraftConverted(paymentIntentId, userId);
        await attachOrderToDraft(paymentIntentId, orderId);
      }
      await rememberUserPhone(userId, customerInfo.phone);
      if (instructions !== undefined) await saveInstructionsOnAddress(userId, cart.selectedAddress._id, instructions);
      if (typeof body.smsOptIn === 'boolean') {
        try {
          const sms = await setSmsConsent(userId, { optedIn: body.smsOptIn, phone: customerInfo.phone, source: 'checkout' });
          if (sms.ok && sms.newlyOptedIn) await sendWelcomeText(userId);
        } catch (smsError) {
          console.warn('[sms] could not save the text-message choice', smsError instanceof Error ? smsError.message : smsError);
        }
      }

      // same follow-up as a successful card payment: confirmation email and the OptimoRoute stop (each best effort)
      try {
        const emailResult = await sendOrderConfirmationEmail(paidOrder as Order);
        if (!emailResult.success) console.error(`[orders/create] confirmation email failed for ${orderId}`, emailResult.error);
      } catch (emailError) {
        console.error(`[orders/create] confirmation email threw for ${orderId}`, emailError);
      }
      await syncOrderSafely(orderId);
      await clearUserCartSafely(userId);

      return NextResponse.json({
        success: true,
        data: { orderId, clientSecret: null, totalAmount: order.totalPaid, paymentMethod: 'Store Credit', paidWithCredit: true },
      });
    }

    // Handle payment method specific logic
    if (paymentMethod === 'Credit Card') {
      // Check if Stripe is properly configured
      if (!stripeSecretKey || stripeSecretKey === 'sk_test_dummy_key_for_build') {
        await giveBackCredit();
        return NextResponse.json(
          { success: false, error: 'Stripe is not properly configured' },
          { status: 500 }
        );
      }

      // Create or reuse Stripe PaymentIntent
      try {
        // the card pays what the store credit does not
        const amountCents = credit.cardCents;
        let paymentIntent: Stripe.PaymentIntent;

        if (paymentIntentId) {
          paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

          if (paymentIntent.status === 'canceled') {
            await giveBackCredit();
            return NextResponse.json(
              { success: false, error: 'Payment session expired. Please refresh the page.' },
              { status: 400 }
            );
          }

          if (paymentIntent.amount !== amountCents) {
            paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
              amount: amountCents,
            });
          }

          paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
            metadata: buildOrderPaymentMetadata(order, siteFromHeaders(request.headers)),
            description: buildOrderDescription(order),
          });
        } else {
          paymentIntent = await stripe.paymentIntents.create({
            amount: amountCents,
            currency: currency || 'usd',
            payment_method_types: ['card'],
            metadata: buildOrderPaymentMetadata(order, siteFromHeaders(request.headers)),
            description: buildOrderDescription(order),
          });
        }

        // Add Stripe PaymentIntent ID to order
        const orderWithStripe: Order = {
          ...order,
          stripePaymentIntentId: paymentIntent.id,
        } as Order;

        // Save order to database
        // formatOrderForDatabase() adds createdAt and updatedAt as Date objects
        const dbOrder = formatOrderForDatabase(orderWithStripe);
        const result = await db.create('orders', dbOrder);

        if (!result.success) {
          console.error('Failed to create order:', { orderId: order.orderId, userId, paymentIntentId: paymentIntent.id, error: result.error });

          // Cancel the PaymentIntent if order creation fails
          await stripe.paymentIntents.cancel(paymentIntent.id);
          await giveBackCredit();

          return NextResponse.json(
            { success: false, error: 'Failed to create order' },
            { status: 500 }
          );
        }

        reservedCredit = null; // the order owns the credit now

        // the customer pressed Pay: remember which order belongs to the checkout draft (best effort)
        await attachOrderToDraft(paymentIntent.id, order.orderId);

        // the phone given at checkout is also saved on the profile when the profile has none (best effort)
        await rememberUserPhone(userId, customerInfo.phone);

        // the instructions typed at checkout are also saved on the selected address for next time (best effort)
        if (instructions !== undefined) await saveInstructionsOnAddress(userId, cart.selectedAddress._id, instructions);

        // the text-message box (best effort; the consent is for the phone given here)
        if (typeof body.smsOptIn === 'boolean') {
          try {
            const sms = await setSmsConsent(userId, { optedIn: body.smsOptIn, phone: customerInfo.phone, source: 'checkout' });
            if (sms.ok && sms.newlyOptedIn) await sendWelcomeText(userId);
          } catch (smsError) {
            console.warn('[sms] could not save the text-message choice', smsError instanceof Error ? smsError.message : smsError);
          }
        }

        // Email will be sent via Stripe webhook when payment succeeds
        // This ensures emails are only sent for successful payments

        return NextResponse.json({
          success: true,
          data: {
            orderId: order.orderId,
            clientSecret: paymentIntent.client_secret,
            totalAmount: order.totalPaid,
            paymentMethod: order.paymentMethod,
          },
        });
      } catch (stripeError) {
        await giveBackCredit();
        console.error('Stripe error while creating the order payment:', {
          orderId: order.orderId,
          userId,
          paymentIntentId,
          message: stripeError instanceof Error ? stripeError.message : String(stripeError),
          stripeCode: (stripeError as { code?: string })?.code,
          stripeType: (stripeError as { type?: string })?.type,
          requestId: (stripeError as { requestId?: string })?.requestId,
        });
        return NextResponse.json(
          {
            success: false,
            error: stripeError instanceof Error ? stripeError.message : 'Failed to create payment intent',
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    await giveBackCredit();
    console.error('Order creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

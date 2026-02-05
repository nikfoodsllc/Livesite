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
  calculateTipAmount,
  formatOrderForDatabase,
} from '@/lib/orderHelpers';
import { calculateDeliveryDates } from '@/lib/deliveryCalculator';
import { DEFAULT_MIN_CART_VALUE } from '@/lib/cartLogic';
import { sendOrderConfirmationEmail } from '@/lib/email';
import Stripe from 'stripe';

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
  paymentMethod: PaymentMethod;
  currency: string;
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
    const { cart, customerInfo, tipPercentage, paymentMethod, currency } = body;

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

    // Create customer info
    const customer = createCustomerInfo(
      customerInfo.name,
      customerInfo.email,
      customerInfo.phone
    );

    // Calculate tip amount
    const tipAmount = calculateTipAmount(cart.subtotal, tipPercentage);

    // Calculate total (cart already has calculated values)
    const totalPaid = cart.subtotal + cart.platformFee + cart.deliveryFee + cart.tax + tipAmount;

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
      platformFee: cart.platformFee,
      deliveryFee: cart.deliveryFee,
      taxes: cart.tax,
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
      paymentMethod,
      deliveryMessages,
    };

    // Handle payment method specific logic
    if (paymentMethod === 'Credit Card') {
      // Check if Stripe is properly configured
      if (!stripeSecretKey || stripeSecretKey === 'sk_test_dummy_key_for_build') {
        return NextResponse.json(
          { success: false, error: 'Stripe is not properly configured' },
          { status: 500 }
        );
      }

      // Create Stripe PaymentIntent
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalPaid * 100), // Convert to cents
          currency: currency || 'usd',
          metadata: {
            orderId: order.orderId,
            userId: userId,
          },
          description: `Order ${order.orderId} for ${customer.name}`,
        });

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
          console.error('Failed to create order:', result.error);

          // Cancel the PaymentIntent if order creation fails
          await stripe.paymentIntents.cancel(paymentIntent.id);

          return NextResponse.json(
            { success: false, error: 'Failed to create order' },
            { status: 500 }
          );
        }

        // Send order confirmation email for Credit Card orders
        try {
          console.log(`[POST /api/orders/create] Sending confirmation email for Credit Card order: ${order.orderId}`);
          const emailResult = await sendOrderConfirmationEmail(orderWithStripe);

          if (emailResult.success) {
            console.log(`[POST /api/orders/create] Confirmation email sent successfully for order: ${order.orderId}`, {
              messageId: emailResult.messageId,
              statusInfo: emailResult.statusInfo,
            });
          } else {
            console.error(`[POST /api/orders/create] Failed to send confirmation email for order: ${order.orderId}`, {
              error: emailResult.error,
              statusInfo: emailResult.statusInfo,
            });
          }
        } catch (emailError) {
          console.error(`[POST /api/orders/create] Exception sending confirmation email for order: ${order.orderId}:`, emailError);
          // Email failure should not break order creation - continue with order response
        }

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
        console.error('Stripe error:', stripeError);
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

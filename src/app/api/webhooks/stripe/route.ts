import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { Order } from '@/types/order';
import { sendOrderConfirmationEmail } from '@/lib/email';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY is not configured in environment variables');
}

const stripe = new Stripe(stripeSecretKey || 'sk_test_dummy_key_for_build', {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is properly configured
    if (!stripeSecretKey || stripeSecretKey === 'sk_test_dummy_key_for_build') {
      console.error('Stripe is not properly configured for webhook handling');
      return NextResponse.json(
        { error: 'Stripe is not properly configured' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    console.log(`[Webhook] Received event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Payment succeeded for PaymentIntent: ${paymentIntent.id}`);

        // Find order by stripePaymentIntentId
        const orderResult = await db.readOne<Order>('orders', {
          stripePaymentIntentId: paymentIntent.id,
        });

        if (!orderResult.success || !orderResult.data) {
          console.error(`[Webhook] Order not found for PaymentIntent: ${paymentIntent.id}`);
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          );
        }

        const order = orderResult.data;

        // Update order status
        const updateResult = await db.updateOne('orders',
          { orderId: order.orderId },
          {
            $set: {
              paymentStatus: 'paid',
              status: 'confirmed',
              updatedAt: new Date(),
            },
          }
        );

        if (!updateResult.success) {
          console.error(`[Webhook] Failed to update order ${order.orderId}:`, updateResult.error);
          return NextResponse.json(
            { error: 'Failed to update order' },
            { status: 500 }
          );
        }

        console.log(`[Webhook] Order ${order.orderId} confirmed and marked as paid`);

        // Send order confirmation email for successful credit card payments
        try {
          console.log(`[Webhook] Sending confirmation email for successful payment order: ${order.orderId}`);
          const emailResult = await sendOrderConfirmationEmail(order);

          if (emailResult.success) {
            console.log(`[Webhook] Confirmation email sent successfully for order: ${order.orderId}`, {
              messageId: emailResult.messageId,
              statusInfo: emailResult.statusInfo,
            });
          } else {
            console.error(`[Webhook] Failed to send confirmation email for order: ${order.orderId}`, {
              error: emailResult.error,
              statusInfo: emailResult.statusInfo,
            });
          }
        } catch (emailError) {
          console.error(`[Webhook] Exception sending confirmation email for order: ${order.orderId}:`, emailError);
          // Email failure should not break webhook processing - continue with normal flow
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Payment failed for PaymentIntent: ${paymentIntent.id}`);

        // Find order by stripePaymentIntentId
        const orderResult = await db.readOne<Order>('orders', {
          stripePaymentIntentId: paymentIntent.id,
        });

        if (!orderResult.success || !orderResult.data) {
          console.error(`[Webhook] Order not found for PaymentIntent: ${paymentIntent.id}`);
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          );
        }

        const order = orderResult.data;

        // Update order status to failed
        const updateResult = await db.updateOne('orders',
          { orderId: order.orderId },
          {
            $set: {
              paymentStatus: 'failed',
              status: 'cancelled',
              updatedAt: new Date(),
            },
          }
        );

        if (!updateResult.success) {
          console.error(`[Webhook] Failed to update order ${order.orderId}:`, updateResult.error);
          return NextResponse.json(
            { error: 'Failed to update order' },
            { status: 500 }
          );
        }

        console.log(`[Webhook] Order ${order.orderId} marked as failed`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge refunded: ${charge.id}`);

        if (!charge.payment_intent) {
          console.error('[Webhook] No payment intent found for charge');
          break;
        }

        // Find order by stripePaymentIntentId
        const orderResult = await db.readOne<Order>('orders', {
          stripePaymentIntentId: charge.payment_intent.toString(),
        });

        if (!orderResult.success || !orderResult.data) {
          console.error(`[Webhook] Order not found for PaymentIntent: ${charge.payment_intent}`);
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          );
        }

        const order = orderResult.data;

        // Update order status to refunded
        const updateResult = await db.updateOne('orders',
          { orderId: order.orderId },
          {
            $set: {
              paymentStatus: 'refunded',
              status: 'cancelled',
              updatedAt: new Date(),
            },
          }
        );

        if (!updateResult.success) {
          console.error(`[Webhook] Failed to update order ${order.orderId}:`, updateResult.error);
          return NextResponse.json(
            { error: 'Failed to update order' },
            { status: 500 }
          );
        }

        console.log(`[Webhook] Order ${order.orderId} marked as refunded`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

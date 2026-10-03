import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { Order } from '@/types/order';
import { sendOrderConfirmationEmail, sendPaymentFailedEmail } from '@/lib/email';
import Stripe from 'stripe';
import { paymentMethodLabelFromCharge, resolvePaymentMethodLabel } from '@/lib/server/paymentMethodLabel';
import { paymentErrorFromIntent } from '@/lib/server/stripePaymentInfo';
import { refundFromCharge } from '@/lib/server/refundInfo';
import { annotatePaymentIntent } from '@/lib/server/stripePaymentNote';

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

        // Record the method Stripe actually used (Apple Pay, Google Pay, ...) instead of the
        // 'Credit Card' placeholder the order was created with
        const paymentMethodLabel = await resolvePaymentMethodLabel(stripe, paymentIntent);

        // Update order status
        const updateResult = await db.updateOne('orders',
          { orderId: order.orderId },
          {
            $set: {
              paymentStatus: 'paid',
              status: 'confirmed',
              ...(paymentMethodLabel ? { paymentMethod: paymentMethodLabel } : {}),
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
        await annotatePaymentIntent(stripe, paymentIntent.id, order, { kind: 'paid' });

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
        }

        break;
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge succeeded: ${charge.id}`);

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

        // Record the method Stripe actually used (Apple Pay, Google Pay, ...) instead of the
        // 'Credit Card' placeholder the order was created with
        const paymentMethodLabel = paymentMethodLabelFromCharge(charge);

        // Update order status
        const updateResult = await db.updateOne('orders',
          { orderId: order.orderId },
          {
            $set: {
              paymentStatus: 'paid',
              status: 'confirmed',
              ...(paymentMethodLabel ? { paymentMethod: paymentMethodLabel } : {}),
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

        // Send order confirmation email
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

        // Keep Stripe's reason (error code, decline code, message) on the order, not just in the email
        const paymentError = paymentErrorFromIntent(paymentIntent, 'payment_failed');
        console.warn(`[Webhook] Payment failed for order ${order.orderId}`, {
          paymentIntentId: paymentIntent.id,
          code: paymentError.code,
          declineCode: paymentError.declineCode,
          type: paymentError.type,
          paymentMethodType: paymentError.paymentMethodType,
        });

        // Update order status to failed
        const updateResult = await db.updateOne('orders',
          { orderId: order.orderId },
          {
            $set: {
              paymentStatus: 'failed',
              status: 'cancelled',
              paymentError,
              updatedAt: new Date(),
            },
            $inc: { paymentAttempts: 1 },
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
        await annotatePaymentIntent(stripe, paymentIntent.id, order, {
          kind: 'failed',
          code: paymentError.code,
          declineCode: paymentError.declineCode,
          attempts: (order.paymentAttempts ?? 0) + 1,
        });

        if (order.paymentFailedEmailStatus?.status === 'sent') {
          console.log(`[Webhook] Payment failed email already sent for order: ${order.orderId}`);
          break;
        }

        const failureReason =
          paymentIntent.last_payment_error?.message ?? 'Payment could not be processed.';

        try {
          console.log(`[Webhook] Sending payment failed email for order: ${order.orderId}`);
          const emailResult = await sendPaymentFailedEmail(order, failureReason);

          if (emailResult.skipped) {
            console.log(`[Webhook] Payment failed email skipped for order: ${order.orderId}`);
          } else if (emailResult.success) {
            console.log(`[Webhook] Payment failed email sent successfully for order: ${order.orderId}`, {
              messageId: emailResult.messageId,
              statusInfo: emailResult.statusInfo,
            });
          } else {
            console.error(`[Webhook] Failed to send payment failed email for order: ${order.orderId}`, {
              error: emailResult.error,
              statusInfo: emailResult.statusInfo,
            });
          }
        } catch (emailError) {
          console.error(`[Webhook] Exception sending payment failed email for order: ${order.orderId}:`, emailError);
        }

        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] PaymentIntent canceled: ${paymentIntent.id}`);

        const orderResult = await db.readOne<Order>('orders', {
          stripePaymentIntentId: paymentIntent.id,
        });

        // Nothing to update when there is no order (e.g. we canceled it ourselves because the order
        // could not be saved): acknowledge instead of 404 so Stripe does not keep retrying.
        if (!orderResult.success || !orderResult.data) {
          console.log(`[Webhook] No order for canceled PaymentIntent ${paymentIntent.id}; nothing to update`);
          break;
        }

        const order = orderResult.data;
        if (order.paymentStatus === 'paid') {
          console.warn(`[Webhook] Ignoring cancel for already paid order ${order.orderId}`);
          break;
        }

        const paymentError = paymentErrorFromIntent(paymentIntent, 'canceled');
        const updateResult = await db.updateOne('orders',
          { orderId: order.orderId },
          {
            $set: {
              paymentStatus: 'failed',
              status: 'cancelled',
              paymentError,
              updatedAt: new Date(),
            },
          }
        );
        if (!updateResult.success) {
          console.error(`[Webhook] Failed to update canceled order ${order.orderId}:`, updateResult.error);
          return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
        }
        console.log(`[Webhook] Order ${order.orderId} marked as canceled`, { code: paymentError.code });
        await annotatePaymentIntent(stripe, paymentIntent.id, order, {
          kind: 'canceled',
          reason: paymentIntent.cancellation_reason || 'canceled',
        });
        break;
      }
      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] PaymentIntent needs customer action (e.g. 3D Secure): ${paymentIntent.id}`);

        // Record when the customer was sent to authenticate, so payments stuck there can be spotted
        const updateResult = await db.updateOne('orders',
          { stripePaymentIntentId: paymentIntent.id, paymentStatus: 'unpaid' },
          { $set: { paymentActionRequiredAt: new Date(), updatedAt: new Date() } }
        );
        if (!updateResult.success) {
          console.error(`[Webhook] Failed to record requires_action for ${paymentIntent.id}:`, updateResult.error);
        }

        const pendingOrder = await db.readOne<Order>('orders', { stripePaymentIntentId: paymentIntent.id });
        if (pendingOrder.success && pendingOrder.data) {
          await annotatePaymentIntent(stripe, paymentIntent.id, pendingOrder.data, { kind: 'needs_action' });
        }
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

        // Record how much was refunded. Only a refund of the whole charge cancels the order; a
        // partial refund (e.g. one missing item) leaves it paid and active.
        const refund = refundFromCharge(charge);
        const now = new Date();
        const updateResult = await db.updateOne('orders',
          { orderId: order.orderId },
          {
            $set: {
              refundedAmount: refund.refundedAmount,
              refundedAt: now,
              ...(refund.fullyRefunded ? { paymentStatus: 'refunded', status: 'cancelled' } : {}),
              updatedAt: now,
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

        console.log(
          `[Webhook] Order ${order.orderId} ${refund.fullyRefunded ? 'fully refunded' : 'partially refunded'}`,
          { refundedAmount: refund.refundedAmount, chargeId: charge.id }
        );
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

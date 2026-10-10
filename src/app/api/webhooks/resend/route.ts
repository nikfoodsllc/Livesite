/**
 * Resend Webhook Handler
 * Processes webhook events from Resend for email delivery tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { applyPaymentLinkEmailEvent } from '@/lib/server/paymentLinkTracking';
import { applyConfirmationEmailEvent } from '@/lib/server/confirmationEmailTracking';
import { applyRescheduleEmailEvent } from '@/lib/server/rescheduleEmailTracking';
import { emailAnalytics } from '@/lib/emailAnalytics';
import { WebhookPayload } from '@/types/email';
import { formatAPITimestamp } from '@/lib/apiDateFormat';

/**
 * POST /api/webhooks/resend
 * Handle webhook events from Resend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Resend signs every webhook (Svix headers). With a secret configured the signature MUST be valid; without one the
    // request is not trusted: it can only feed the older analytics, and never touches an order.
    let verified = false;
    if (webhookSecret) {
      try {
        new Resend(process.env.RESEND_API_KEY || 're_unused').webhooks.verify({
          payload: body,
          headers: {
            id: request.headers.get('svix-id') ?? '',
            timestamp: request.headers.get('svix-timestamp') ?? '',
            signature: request.headers.get('svix-signature') ?? '',
          },
          webhookSecret,
        });
        verified = true;
      } catch {
        console.error('[Webhook] Invalid or missing webhook signature');
        return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    console.log('[Webhook] Received Resend webhook:', {
      verified,
      bodyLength: body.length,
      timestamp: formatAPITimestamp(new Date()),
    });

    // Parse webhook payload
    let webhookPayload: WebhookPayload;
    try {
      webhookPayload = JSON.parse(body);
    } catch (parseError) {
      console.error('[Webhook] Failed to parse webhook payload:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate webhook payload structure
    if (!webhookPayload.type || !webhookPayload.data) {
      console.error('[Webhook] Invalid webhook payload structure:', {
        hasType: !!webhookPayload.type,
        hasData: !!webhookPayload.data,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid webhook payload structure' },
        { status: 400 }
      );
    }

    console.log('[Webhook] Processing webhook payload:', {
      type: webhookPayload.type,
      created_at: webhookPayload.created_at,
      emailId: webhookPayload.data?.email_id,
      eventCount: webhookPayload.data?.events?.length,
    });

    // The payment-link or the confirmation email of an order: remember delivered / bounced / opened on the order (verified requests only)
    if (verified) {
      const data = webhookPayload.data as unknown as { email_id?: string; bounce?: { message?: string } };
      const when = new Date(webhookPayload.created_at ?? Date.now());
      const event = {
        type: webhookPayload.type,
        emailId: String(data.email_id ?? ''),
        at: Number.isNaN(when.getTime()) ? new Date() : when,
        bounceReason: data.bounce?.message,
      };
      // an email belongs to one of three: a payment link (kept on the order's link emails), a moved-date email, or the order confirmation
      if (!(await applyPaymentLinkEmailEvent(event)) && !(await applyRescheduleEmailEvent(event))) await applyConfirmationEmailEvent(event);
    }

    // Process webhook events through analytics service
    const result = await emailAnalytics.processWebhook(webhookPayload);

    if (!result.success) {
      console.error('[Webhook] Failed to process webhook:', result.error);

      // Still return 200 to Resend to acknowledge receipt
      // but include error details for logging
      return NextResponse.json({
        success: false,
        error: result.error,
        processedEvents: result.processedEvents,
        acknowledged: true, // Tell Resend we received the webhook
      });
    }

    console.log('[Webhook] Webhook processed successfully:', {
      processedEvents: result.processedEvents,
      timestamp: formatAPITimestamp(new Date()),
    });

    return NextResponse.json({
      success: true,
      processedEvents: result.processedEvents,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('[Webhook] Unexpected error processing webhook:', error);

    // Always return 200 to prevent Resend from retrying indefinitely
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      acknowledged: true,
    });
  }
}

/**
 * GET /api/webhooks/resend
 * Get webhook status and configuration information
 */
export async function GET() {
  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;

    return NextResponse.json({
      success: true,
      data: {
        webhookConfigured: !!webhookSecret,
        resendConfigured: !!(resendApiKey && resendFromEmail),
        endpoint: '/api/webhooks/resend',
        supportedEvents: [
          'sent',
          'delivered',
          'opened',
          'clicked',
          'bounced',
          'complained',
          'rejected',
        ],
        documentation: {
          setupUrl: 'https://resend.com/docs/webhooks',
          configurationSteps: [
            '1. Go to Resend Dashboard > Webhooks',
            '2. Add new webhook endpoint: ' + new URL('/api/webhooks/resend', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').href,
            '3. Select events: sent, delivered, opened, clicked, bounced, complained, rejected',
            '4. Set webhook secret (RESEND_WEBHOOK_SECRET environment variable)',
            '5. Save and test the webhook',
          ],
        },
      },
    });
  } catch (error) {
    console.error('[Webhook] Error getting webhook status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

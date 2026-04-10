/**
 * Resend Webhook Handler
 * Processes webhook events from Resend for email delivery tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
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
    const signature = request.headers.get('resend-signature');
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    console.log('[Webhook] Received Resend webhook:', {
      hasSignature: !!signature,
      bodyLength: body.length,
      timestamp: formatAPITimestamp(new Date()),
    });

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('[Webhook] Invalid webhook signature');
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
      console.log('[Webhook] Signature verified successfully');
    } else if (webhookSecret) {
      console.warn('[Webhook] Webhook secret configured but no signature provided');
    }

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

/**
 * Verify webhook signature using HMAC-SHA256
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Resend uses timestamp.signature format
    const [timestamp, sig] = signature.split(',');

    if (!timestamp || !sig) {
      console.warn('[Webhook] Invalid signature format:', signature);
      return false;
    }

    // Extract timestamp value
    const timestampMatch = timestamp.match(/t=(\d+)/);
    if (!timestampMatch) {
      console.warn('[Webhook] Invalid timestamp format:', timestamp);
      return false;
    }

    const webhookTime = parseInt(timestampMatch[1]);
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if timestamp is recent (within 5 minutes)
    if (Math.abs(currentTime - webhookTime) > 300) {
      console.warn('[Webhook] Timestamp too old:', {
        webhookTime,
        currentTime,
        difference: Math.abs(currentTime - webhookTime),
      });
      return false;
    }

    // Extract signature value
    const signatureMatch = sig.match(/signature=([a-f0-9]+)/);
    if (!signatureMatch) {
      console.warn('[Webhook] Invalid signature value:', sig);
      return false;
    }

    const expectedSignature = signatureMatch[1];

    // Create expected signature
    const signedPayload = `${timestampMatch[1]}.${payload}`;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    );
  } catch (error) {
    console.error('[Webhook] Error verifying signature:', error);
    return false;
  }
}
/**
 * Email Analytics API Endpoint
 * Provides comprehensive email performance analytics and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { emailAnalytics } from '@/lib/emailAnalytics';
import {
  EmailAnalyticsQuery,
  WebhookPayload,
  EmailType,
  EmailDeliveryStatus
} from '@/types/email';

/**
 * GET /api/admin/email-analytics
 * Get email analytics data with filtering options
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query: EmailAnalyticsQuery = {
      emailType: searchParams.get('emailType') as EmailType || undefined,
      status: searchParams.get('status') as EmailDeliveryStatus || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      orderId: searchParams.get('orderId') || undefined,
      userId: searchParams.get('userId') || undefined,
      toEmail: searchParams.get('toEmail') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: (searchParams.get('sortBy') as EmailAnalyticsQuery['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as EmailAnalyticsQuery['sortOrder']) || 'desc',
    };

    // Validate query parameters
    if (query.limit && query.limit > 1000) {
      return NextResponse.json(
        { success: false, error: 'Limit cannot exceed 1000' },
        { status: 400 }
      );
    }

    if (query.startDate && isNaN(new Date(query.startDate).getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid startDate format' },
        { status: 400 }
      );
    }

    if (query.endDate && isNaN(new Date(query.endDate).getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid endDate format' },
        { status: 400 }
      );
    }

    console.log('[GET /api/admin/email-analytics] Getting analytics data:', query);

    // Get analytics data
    const result = await emailAnalytics.getAnalytics(query);

    if (!result.success || !result.data) {
      console.error('[GET /api/admin/email-analytics] Failed to get analytics:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to get analytics data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[GET /api/admin/email-analytics] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email-analytics
 * Handle webhook events from Resend
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('resend-signature');
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      // TODO: Implement webhook signature verification
      // This requires crypto verification of the signature
      console.log('[POST /api/admin/email-analytics] Webhook signature found:', signature);
    }

    // Parse webhook payload
    const body = await request.json();

    // Validate webhook payload structure
    if (!body.type || !body.data) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const webhookPayload: WebhookPayload = body;

    console.log('[POST /api/admin/email-analytics] Processing webhook:', {
      type: webhookPayload.type,
      created_at: webhookPayload.created_at,
      emailId: webhookPayload.data?.email_id,
      eventCount: webhookPayload.data?.events?.length,
    });

    // Process webhook events
    const result = await emailAnalytics.processWebhook(webhookPayload);

    if (!result.success) {
      console.error('[POST /api/admin/email-analytics] Failed to process webhook:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to process webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        processedEvents: result.processedEvents,
        message: 'Webhook processed successfully',
      },
    });
  } catch (error) {
    console.error('[POST /api/admin/email-analytics] Error processing webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
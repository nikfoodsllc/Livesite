import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { runEmailRetryCronJob, getEmailRetryHealthCheck, manualEmailRetryTrigger } from '@/lib/emailCronJob';
import { formatAPITimestamp } from '@/lib/apiDateFormat';

const EMAIL_RETRY_CONFIG = {
  CRON_ENABLED: process.env.EMAIL_RETRY_CRON_ENABLED !== 'false',
  CRON_SCHEDULE: process.env.EMAIL_RETRY_CRON_SCHEDULE || '*/15 * * * *', // Every 15 minutes
  MAX_RETRY_ATTEMPTS: parseInt(process.env.EMAIL_MAX_RETRY_ATTEMPTS || '3'),
  RETRY_DELAY_MINUTES: parseInt(process.env.EMAIL_RETRY_DELAY_MINUTES || '15'),
  FAILURE_RATE_THRESHOLD: parseFloat(process.env.EMAIL_FAILURE_RATE_THRESHOLD || '20'), // 20%
  MAX_FAILURE_HOURS: parseInt(process.env.EMAIL_MAX_FAILURE_HOURS || '24'), // 24 hours
};

/**
 * POST /api/admin/email-cron
 * Manually trigger the email retry cron job
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

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { orderId, force } = body;

    console.log(`[POST /api/admin/email-cron] Manual cron trigger - orderId: ${orderId || 'all'}, force: ${force}`);

    let result;

    if (force || orderId) {
      // Force retry for specific order or all
      result = await manualEmailRetryTrigger({ orderId, force });
    } else {
      // Run normal cron job
      result = await runEmailRetryCronJob();
    }

    return NextResponse.json({
      success: result.success,
      data: {
        message: result.message,
        results: result.results,
        config: EMAIL_RETRY_CONFIG,
        timestamp: formatAPITimestamp(new Date()),
      },
      ...(result.error && { error: result.error }),
    });
  } catch (error) {
    console.error('[POST /api/admin/email-cron] Error:', error);
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
 * GET /api/admin/email-cron
 * Get email retry system health check and configuration
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

    console.log('[GET /api/admin/email-cron] Getting email retry system health');

    const healthCheck = await getEmailRetryHealthCheck();

    return NextResponse.json({
      success: true,
      data: {
        healthy: healthCheck.healthy,
        message: healthCheck.message,
        stats: healthCheck.stats,
        lastCheck: healthCheck.lastCheck,
        config: EMAIL_RETRY_CONFIG,
        timestamp: formatAPITimestamp(new Date()),
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/email-cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
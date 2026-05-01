import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { processAllEmailRetries, processEmailRetryJob, getEmailRetryStats } from '@/lib/emailRetryJob';

/**
 * POST /api/admin/email-retry
 * Manually trigger email retry processing
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

    // Parse request body for specific order ID (optional)
    const body = await request.json().catch(() => ({}));
    const { orderId } = body;

    console.log(`[POST /api/admin/email-retry] Processing email retry - orderId: ${orderId || 'all'}`);

    let result;

    if (orderId) {
      // Process specific order
      result = await processEmailRetryJob(orderId);

      return NextResponse.json({
        success: true,
        data: {
          orderId,
          processed: true,
          result: {
            success: result.success,
            error: result.error,
            shouldRetry: result.shouldRetry,
            retryDelay: result.retryDelay,
            statusInfo: result.statusInfo,
          },
        },
      });
    } else {
      // Process all pending retries
      result = await processAllEmailRetries();

      return NextResponse.json({
        success: true,
        data: {
          orderId: 'all',
          processed: true,
          result: result,
        },
      });
    }
  } catch (error) {
    console.error('[POST /api/admin/email-retry] Error:', error);
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
 * GET /api/admin/email-retry
 * Get email retry statistics
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

    console.log('[GET /api/admin/email-retry] Getting email retry statistics');

    const stats = await getEmailRetryStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[GET /api/admin/email-retry] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
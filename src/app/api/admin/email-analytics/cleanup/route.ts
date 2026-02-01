/**
 * Email Analytics Cleanup API Endpoint
 * Manages cleanup of old analytics data
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { emailAnalytics } from '@/lib/emailAnalytics';

/**
 * POST /api/admin/email-analytics/cleanup
 * Trigger cleanup of old analytics data
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

    // Parse request body
    const body = await request.json();
    const { force = false } = body;

    console.log('[POST /api/admin/email-analytics/cleanup] Starting cleanup:', { force });

    // Perform cleanup
    const result = await emailAnalytics.cleanupOldData();

    if (!result.success) {
      console.error('[POST /api/admin/email-analytics/cleanup] Cleanup failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Cleanup failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedEvents: result.deletedEvents,
        deletedSummaries: result.deletedSummaries,
        message: 'Cleanup completed successfully',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[POST /api/admin/email-analytics/cleanup] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
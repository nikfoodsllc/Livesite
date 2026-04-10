/**
 * Email Analytics Dashboard API Endpoint
 * Provides dashboard data for email performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { emailAnalytics } from '@/lib/emailAnalytics';
import { EmailAnalyticsQuery } from '@/types/email';

/**
 * GET /api/admin/email-analytics/dashboard
 * Get dashboard data for email analytics
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
      emailType: searchParams.get('emailType') as EmailAnalyticsQuery['emailType'] || undefined,
      status: searchParams.get('status') as EmailAnalyticsQuery['status'] || undefined,
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

    console.log('[GET /api/admin/email-analytics/dashboard] Getting dashboard data:', query);

    // Get dashboard data
    const result = await emailAnalytics.getDashboard(query);

    if (!result.success || !result.data) {
      console.error('[GET /api/admin/email-analytics/dashboard] Failed to get dashboard:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to get dashboard data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[GET /api/admin/email-analytics/dashboard] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
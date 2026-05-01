/**
 * Email Analytics Export API Endpoint
 * Exports analytics data in various formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { emailAnalytics } from '@/lib/emailAnalytics';
import { EmailAnalyticsQuery, EmailType, EmailDeliveryStatus, EmailAnalyticsResponse } from '@/types/email';
import { getPSTDateString } from '@/lib/timezone';
import { formatAPIDate } from '@/lib/apiDateFormat';

/**
 * GET /api/admin/email-analytics/export
 * Export analytics data in specified format
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
      limit: parseInt(searchParams.get('limit') || '5000'), // Reduced limit for exports
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: (searchParams.get('sortBy') as EmailAnalyticsQuery['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as EmailAnalyticsQuery['sortOrder']) || 'desc',
    };

    const format = searchParams.get('format') || 'json';
    const filename = searchParams.get('filename') || `email-analytics-${getPSTDateString()}`;

    // Validate format
    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid export format. Supported formats: json, csv' },
        { status: 400 }
      );
    }

    // Validate query parameters
    if (query.limit && query.limit > 10000) {
      return NextResponse.json(
        { success: false, error: 'Export limit cannot exceed 10000 records' },
        { status: 400 }
      );
    }

    console.log('[GET /api/admin/email-analytics/export] Exporting analytics data:', {
      format,
      filename,
      query,
    });

    // Get analytics data with memory management
    const result = await emailAnalytics.getAnalytics(query);

    if (!result.success || !result.data) {
      console.error('[GET /api/admin/email-analytics/export] Failed to get analytics for export:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to get analytics data for export' },
        { status: 500 }
      );
    }

    const analyticsData = result.data;

    // For large exports, process in smaller chunks to prevent memory issues
    if (analyticsData.analytics.length > 5000) {
      console.warn('[GET /api/admin/email-analytics/export] Large export detected, consider using pagination for better performance');
    }

    // Format data based on requested format
    let exportData: string;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(analyticsData, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;

      case 'csv':
        exportData = convertToCSV(analyticsData);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported export format' },
          { status: 400 }
        );
    }

    // Return file download
    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}.${fileExtension}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/email-analytics/export] Error:', error);
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
 * Convert analytics data to CSV format (memory efficient)
 */
function convertToCSV(analyticsData: EmailAnalyticsResponse): string {
  const headers = [
    'Message ID',
    'Email Type',
    'To Email',
    'Order ID',
    'User ID',
    'Subject',
    'From Email',
    'Sent At',
    'Delivered At',
    'Opened At',
    'Clicked At',
    'Bounced At',
    'Complained At',
    'Rejected At',
    'Last Status',
    'Total Events',
    'Is Delivered',
    'Is Bounced',
    'Is Complained',
    'Created At',
    'Updated At',
  ];

  const csvRows: string[] = [headers.join(',')];

  // Process rows in chunks to manage memory better
  const chunkSize = 1000;
  for (let i = 0; i < analyticsData.analytics.length; i += chunkSize) {
    const chunk = analyticsData.analytics.slice(i, i + chunkSize);

    const chunkRows = chunk.map((summary) => {
      const row = [
        summary.messageId,
        summary.emailType,
        summary.toEmail,
        summary.orderId || '',
        summary.userId || '',
        summary.subject,
        summary.fromEmail,
        summary.sentAt ? formatAPIDate(summary.sentAt) : '',
        summary.deliveredAt ? formatAPIDate(summary.deliveredAt) : '',
        summary.openedAt ? formatAPIDate(summary.openedAt) : '',
        summary.clickedAt ? formatAPIDate(summary.clickedAt) : '',
        summary.bouncedAt ? formatAPIDate(summary.bouncedAt) : '',
        summary.complainedAt ? formatAPIDate(summary.complainedAt) : '',
        summary.rejectedAt ? formatAPIDate(summary.rejectedAt) : '',
        summary.lastStatus,
        summary.totalEvents,
        summary.isDelivered,
        summary.isBounced,
        summary.isComplained,
        formatAPIDate(summary.createdAt),
        formatAPIDate(summary.updatedAt),
      ];

      return row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

    csvRows.push(...chunkRows);
  }

  return csvRows.join('\n');
}
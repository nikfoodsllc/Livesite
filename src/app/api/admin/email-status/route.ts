import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { db } from '@/lib/server/db';
import { Order, EmailStatus } from '@/types/order';
import { getPSTDateString, getPSTMidnight } from '@/lib/timezone';
import { formatAPIDate } from '@/lib/apiDateFormat';

interface EmailStatusQuery {
  status?: EmailStatus;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface EmailStatusReport {
  totalOrders: number;
  pendingEmails: number;
  sentEmails: number;
  failedEmails: number;
  retryingEmails: number;
  emailsByPaymentMethod: {
    'Cash on Delivery': {
      total: number;
      sent: number;
      failed: number;
      pending: number;
      retrying: number;
    };
    'Credit Card': {
      total: number;
      sent: number;
      failed: number;
      pending: number;
      retrying: number;
    };
  };
  emailsByDate: Array<{
    date: string;
    total: number;
    sent: number;
    failed: number;
    pending: number;
    retrying: number;
  }>;
  recentFailures: Array<{
    orderId: string;
    customerEmail: string;
    paymentMethod: string;
    lastAttempt: string;
    attempts: number;
    error: string;
  }>;
}

/**
 * GET /api/admin/email-status
 * Get comprehensive email status monitoring data
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
    const query: EmailStatusQuery = {
      status: searchParams.get('status') as EmailStatus || undefined,
      paymentMethod: searchParams.get('paymentMethod') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    console.log('[GET /api/admin/email-status] Getting email status monitoring data:', query);

    // Build database query
    const dbQuery: Record<string, unknown> = {};

    if (query.status) {
      dbQuery['emailStatus.status'] = query.status;
    }

    if (query.paymentMethod) {
      dbQuery.paymentMethod = query.paymentMethod;
    }

    if (query.startDate || query.endDate) {
      dbQuery.createdAt = {};
      if (query.startDate) {
        const startDatePST = getPSTMidnight(new Date(query.startDate));
        (dbQuery.createdAt as Record<string, Date>).$gte = startDatePST;
      }
      if (query.endDate) {
        const endDateMidnight = getPSTMidnight(new Date(query.endDate));
        const endDatePST = new Date(endDateMidnight.getTime() + (24 * 60 * 60 * 1000) - 1);
        (dbQuery.createdAt as Record<string, Date>).$lte = endDatePST;
      }
    }

    // Get orders matching the query
    const ordersResult = await db.read<Order>('orders', dbQuery, {
      limit: query.limit,
      skip: query.offset,
      sort: { createdAt: -1 },
    });

    if (!ordersResult.success) {
      console.error('[GET /api/admin/email-status] Failed to fetch orders:', ordersResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch order data' },
        { status: 500 }
      );
    }

    const orders = ordersResult.data || [];

    // Generate comprehensive report
    const report = await generateEmailStatusReport(orders);

    return NextResponse.json({
      success: true,
      data: {
        query,
        totalOrders: orders.length,
        orders: orders.map(order => ({
          orderId: order.orderId,
          customerName: order.customerInfo.name,
          customerEmail: order.customerInfo.email,
          paymentMethod: order.paymentMethod,
          status: order.status,
          totalPaid: order.totalPaid,
          createdAt: order.createdAt,
          emailStatus: order.emailStatus || {
            status: 'pending',
            attempts: 0,
          },
        })),
        report,
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/email-status] Error:', error);
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
 * Generate comprehensive email status report
 */
async function generateEmailStatusReport(orders: Order[]): Promise<EmailStatusReport> {
  // Initialize counters
  let pendingEmails = 0;
  let sentEmails = 0;
  let failedEmails = 0;
  let retryingEmails = 0;

  const emailsByPaymentMethod = {
    'Cash on Delivery': { total: 0, sent: 0, failed: 0, pending: 0, retrying: 0 },
    'Credit Card': { total: 0, sent: 0, failed: 0, pending: 0, retrying: 0 },
  };

  const emailsByDate: Record<string, { total: number; sent: number; failed: number; pending: number; retrying: number }> = {};
  const recentFailures: Array<{
    orderId: string;
    customerEmail: string;
    paymentMethod: string;
    lastAttempt: string;
    attempts: number;
    error: string;
  }> = [];

  // Process each order
  orders.forEach((order: Order) => {
    const paymentMethod = order.paymentMethod;
    const emailStatus = order.emailStatus || { status: 'pending' as EmailStatus, attempts: 0 };
    const createdDate = order.createdAt ? getPSTDateString(new Date(order.createdAt)) : 'unknown';

    // Update payment method counters
    if (paymentMethod in emailsByPaymentMethod) {
      emailsByPaymentMethod[paymentMethod as keyof typeof emailsByPaymentMethod].total++;
    }

    // Initialize date counter if not exists
    if (!emailsByDate[createdDate]) {
      emailsByDate[createdDate] = { total: 0, sent: 0, failed: 0, pending: 0, retrying: 0 };
    }

    // Update date counters
    emailsByDate[createdDate].total++;

    // Process email status
    switch (emailStatus.status) {
      case 'pending':
        pendingEmails++;
        emailsByDate[createdDate].pending++;
        if (paymentMethod in emailsByPaymentMethod) {
          emailsByPaymentMethod[paymentMethod as keyof typeof emailsByPaymentMethod].pending++;
        }
        break;

      case 'sent':
        sentEmails++;
        emailsByDate[createdDate].sent++;
        if (paymentMethod in emailsByPaymentMethod) {
          emailsByPaymentMethod[paymentMethod as keyof typeof emailsByPaymentMethod].sent++;
        }
        break;

      case 'failed':
        failedEmails++;
        emailsByDate[createdDate].failed++;
        if (paymentMethod in emailsByPaymentMethod) {
          emailsByPaymentMethod[paymentMethod as keyof typeof emailsByPaymentMethod].failed++;
        }

        // Add to recent failures if has error
        if (emailStatus.error && recentFailures.length < 50) {
          recentFailures.push({
            orderId: order.orderId,
            customerEmail: order.customerInfo.email,
            paymentMethod: order.paymentMethod,
            lastAttempt: emailStatus.lastAttempt ? formatAPIDate(emailStatus.lastAttempt) : 'unknown',
            attempts: emailStatus.attempts,
            error: emailStatus.error,
          });
        }
        break;

      case 'retrying':
        retryingEmails++;
        emailsByDate[createdDate].retrying++;
        if (paymentMethod in emailsByPaymentMethod) {
          emailsByPaymentMethod[paymentMethod as keyof typeof emailsByPaymentMethod].retrying++;
        }
        break;
    }
  });

  // Sort emails by date (most recent first)
  const sortedEmailsByDate = Object.entries(emailsByDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ date, ...data }));

  // Sort recent failures by last attempt (most recent first)
  const sortedRecentFailures = recentFailures
    .sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime());

  return {
    totalOrders: orders.length,
    pendingEmails,
    sentEmails,
    failedEmails,
    retryingEmails,
    emailsByPaymentMethod,
    emailsByDate: sortedEmailsByDate,
    recentFailures: sortedRecentFailures,
  };
}

/**
 * POST /api/admin/email-status
 * Resend email for specific order
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
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    console.log(`[POST /api/admin/email-status] Resending email for order: ${orderId}`);

    // Get the order
    const orderResult = await db.readOne<Order>('orders', { orderId });

    if (!orderResult.success || !orderResult.data) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.data;

    // Import and use the enhanced email service
    const { sendOrderConfirmationEmail } = await import('@/lib/email');
    const emailResult = await sendOrderConfirmationEmail(order);

    if (emailResult.success) {
      console.log(`[POST /api/admin/email-status] Email resent successfully for order: ${orderId}`, {
        messageId: emailResult.messageId,
        statusInfo: emailResult.statusInfo,
      });

      return NextResponse.json({
        success: true,
        data: {
          orderId,
          emailSent: true,
          messageId: emailResult.messageId,
          statusInfo: emailResult.statusInfo,
        },
      });
    } else {
      console.error(`[POST /api/admin/email-status] Failed to resend email for order: ${orderId}`, {
        error: emailResult.error,
        statusInfo: emailResult.statusInfo,
      });

      return NextResponse.json(
        {
          success: false,
          error: emailResult.error,
          data: {
            orderId,
            emailSent: false,
            statusInfo: emailResult.statusInfo,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[POST /api/admin/email-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
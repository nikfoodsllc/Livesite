/**
 * Email Analytics Test Endpoint
 * Provides testing and validation functionality for the email analytics system
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { emailAnalytics } from '@/lib/emailAnalytics';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { Order } from '@/types/order';

/**
 * GET /api/admin/email-analytics/test
 * Test the email analytics system
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
        { success: false, error: verifyResult.error || 'Invalid authentication token' }
      );
      // status handled in NextResponse.json constructor
      }

    console.log('[Test] Starting email analytics system test');

    const testResults = [];

    // Test 1: Analytics Service Initialization
    try {
      await emailAnalytics.initialize();
      testResults.push({
        test: 'Analytics Service Initialization',
        status: 'success',
        message: 'Analytics service initialized successfully',
      });
    } catch (error) {
      testResults.push({
        test: 'Analytics Service Initialization',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 2: Email Tracking
    try {
      const testMessageId = 'test-' + Date.now();
      const trackResult = await emailAnalytics.trackEmailSent(
        testMessageId,
        'order_confirmation',
        'test@example.com',
        'TEST-ORDER-123',
        'test-user-123',
        'Test Email',
        'test@nikfoods-email.synngular.com'
      );

      if (trackResult.success) {
        testResults.push({
          test: 'Email Tracking',
          status: 'success',
          message: `Email tracked successfully with summary ID: ${trackResult.summaryId}`,
          data: { messageId: testMessageId, summaryId: trackResult.summaryId },
        });

        // Test 3: Event Tracking
        try {
          const eventResult = await emailAnalytics.trackEvent(
            testMessageId,
            'order_confirmation',
            'test@example.com',
            'TEST-ORDER-123',
            'test-user-123',
            'delivered',
            { ip: '127.0.0.1', userAgent: 'Test User Agent' },
            'test-event-' + Date.now()
          );

          if (eventResult.success) {
            testResults.push({
              test: 'Event Tracking',
              status: 'success',
              message: 'Delivery event tracked successfully',
              data: { messageId: testMessageId, event: 'delivered' },
            });
          } else {
            throw new Error(eventResult.error);
          }
        } catch (eventError) {
          testResults.push({
            test: 'Event Tracking',
            status: 'error',
            message: eventError instanceof Error ? eventError.message : 'Unknown error',
          });
        }
      } else {
        throw new Error(trackResult.error);
      }
    } catch (trackError) {
      testResults.push({
        test: 'Email Tracking',
        status: 'error',
        message: trackError instanceof Error ? trackError.message : 'Unknown error',
      });
    }

    // Test 4: Analytics Data Retrieval
    try {
      const analyticsResult = await emailAnalytics.getAnalytics({
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (analyticsResult.success) {
        testResults.push({
          test: 'Analytics Data Retrieval',
          status: 'success',
          message: `Retrieved ${analyticsResult.data?.summary.totalEmails} analytics records`,
          data: { totalRecords: analyticsResult.data?.summary.totalEmails },
        });
      } else {
        throw new Error(analyticsResult.error);
      }
    } catch (analyticsError) {
      testResults.push({
        test: 'Analytics Data Retrieval',
        status: 'error',
        message: analyticsError instanceof Error ? analyticsError.message : 'Unknown error',
      });
    }

    // Test 5: Dashboard Data
    try {
      const dashboardResult = await emailAnalytics.getDashboard();

      if (dashboardResult.success) {
        testResults.push({
          test: 'Dashboard Data Generation',
          status: 'success',
          message: 'Dashboard data generated successfully',
          data: {
            totalEmails: dashboardResult.data?.overview.totalEmails,
            deliveryRate: dashboardResult.data?.overview.deliveryRate,
            alertsCount: dashboardResult.data?.alerts.length,
          },
        });
      } else {
        throw new Error(dashboardResult.error);
      }
    } catch (dashboardError) {
      testResults.push({
        test: 'Dashboard Data Generation',
        status: 'error',
        message: dashboardError instanceof Error ? dashboardError.message : 'Unknown error',
      });
    }

    // Test 6: Configuration
    try {
      const configCheck = {
        resendApiKey: !!process.env.RESEND_API_KEY,
        resendFromEmail: !!process.env.RESEND_FROM_EMAIL,
        webhookSecret: !!process.env.RESEND_WEBHOOK_SECRET,
        databaseUrl: !!process.env.DATABASE_URL,
      };

      const missingConfigs = Object.entries(configCheck)
        .filter(([, value]) => !value)
        .map(([key]) => key);

      if (missingConfigs.length === 0) {
        testResults.push({
          test: 'Environment Configuration',
          status: 'success',
          message: 'All required environment variables are configured',
          data: configCheck,
        });
      } else {
        testResults.push({
          test: 'Environment Configuration',
          status: 'warning',
          message: `Missing environment variables: ${missingConfigs.join(', ')}`,
          data: { missing: missingConfigs, configured: configCheck },
        });
      }
    } catch (configError) {
      testResults.push({
        test: 'Environment Configuration',
        status: 'error',
        message: configError instanceof Error ? configError.message : 'Unknown error',
      });
    }

    // Calculate overall status
    const successCount = testResults.filter(r => r.status === 'success').length;
    const errorCount = testResults.filter(r => r.status === 'error').length;
    const warningCount = testResults.filter(r => r.status === 'warning').length;

    const overallStatus = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success';

    console.log('[Test] Email analytics test completed:', {
      overallStatus,
      successCount,
      errorCount,
      warningCount,
    });

    return NextResponse.json({
      success: overallStatus !== 'error',
      data: {
        overallStatus,
        summary: {
          totalTests: testResults.length,
          successCount,
          errorCount,
          warningCount,
        },
        tests: testResults,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Test] Error running email analytics test:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
    // status handled in NextResponse.json constructor
  }
}

/**
 * POST /api/admin/email-analytics/test
 * Send a test email for analytics tracking
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }
      );
      // status handled in NextResponse.json constructor
      }

    const token = authHeader.replace('Bearer ', '');
    const verifyResult = jwtHandler.verifyToken(token);

    if (!verifyResult.success || !verifyResult.payload) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || 'Invalid authentication token' }
      );
      // status handled in NextResponse.json constructor
      }

    // Parse request body
    const body = await request.json();
    const { email, sendTestEmail = false } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    console.log('[Test] Sending test email to:', email);

    if (sendTestEmail) {
      // Create a test order for sending
      const testOrder: Order = {
        orderId: 'TEST-' + Date.now(),
        user: 'test-user-' + Date.now(),
        items: [
          {
            day: 'Monday',
            deliveryDate: new Date(),
            items: [
              {
                food: {
                  _id: 'test-food-1',
                  name: 'Test Dish',
                  price: 15.99,
                  image: '/test-image.jpg',
                  category: 'main',
                  description: 'Test description',
                  spiceLevel: ['medium'],
                  portions: ["2"],
                  sections: [],
                },
                quantity: 1,
                price: 15.99,
                spiceLevel: 'medium',
                comboSelections: {},
              },
            ],
            dayTotal: 15.99,
          },
        ],
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          apartment: 'Apt 4B',
          floor: '2nd Floor',
          landmark: 'Test Landmark',
        },
        customerInfo: {
          name: 'Test Customer',
          email: email,
          phone: '555-123-4567',
        },
        subtotal: 15.99,
        platformFee: 1.00,
        deliveryFee: 5.00,
        taxes: 1.60,
        tip: 2.00,
        totalPaid: 25.59,
        currency: 'usd',
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'Credit Card',
        minOrderValue: 15.99,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Send test order confirmation email
      const emailResult = await sendOrderConfirmationEmail(testOrder);

      if (emailResult.success) {
        return NextResponse.json({
          success: true,
          data: {
            message: 'Test email sent successfully',
            orderId: testOrder.orderId,
            email: email,
            messageId: emailResult.messageId,
            statusInfo: emailResult.statusInfo,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: emailResult.error || 'Failed to send test email',
          },
          { status: 500 }
        );
      }
    } else {
      // Just validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'Email format is valid',
          email: email,
          note: 'Set sendTestEmail=true to actually send a test email',
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('[Test] Error sending test email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
    // status handled in NextResponse.json constructor
  }
}
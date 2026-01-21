import { NextRequest, NextResponse } from 'next/server';
import { sendOrderConfirmationEmail, sendPasswordResetOTP, sendPasswordResetConfirmation } from '@/lib/email';
import { Order } from '@/types/order';
import { formatAPITimestamp } from '@/lib/apiDateFormat';

/**
 * POST /api/test/email
 * Test endpoint to verify email service functionality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, testEmail, orderData } = body;

    console.log(`[POST /api/test/email] Testing email service - type: ${type}, testEmail: ${testEmail}`);

    if (!testEmail) {
      return NextResponse.json(
        { success: false, error: 'Test email address is required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'password-reset':
        result = await sendPasswordResetOTP(testEmail, '123456');
        break;

      case 'password-reset-confirmation':
        result = await sendPasswordResetConfirmation(testEmail);
        break;

      case 'order-confirmation':
        // Create test order data if not provided
        const testOrder: Order = orderData || {
          _id: 'test-order-id',
          orderId: 'TEST-123456',
          user: 'test-user-id',
          items: [
            {
              day: 'Monday',
              deliveryDate: new Date(),
              dayTotal: 25.99,
              items: [
                {
                  food: {
                    _id: 'test-food-id',
                    name: 'Butter Chicken',
                    description: 'Delicious butter chicken curry',
                    price: 15.99,
                    category: 'main',
                    portions: 2,
                    spiceLevel: 'medium',
                    sections: [],
                    imageUrl: '',
                    available: true,
                  },
                  quantity: 2,
                  price: 15.99,
                  spiceLevel: 'medium',
                  comboSelections: {},
                },
              ],
            },
          ],
          address: {
            street: '123 Test Street',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            apartment: 'Apt 4B',
            floor: '2nd Floor',
            landmark: 'Near Test Landmark',
          },
          customerInfo: {
            name: 'Test Customer',
            email: testEmail,
            phone: '555-123-4567',
          },
          subtotal: 25.99,
          platformFee: 2.99,
          deliveryFee: 4.99,
          taxes: 3.50,
          tip: 5.00,
          discount: {
            code: 'TEST10',
            amount: 2.50,
          },
          totalPaid: 37.97,
          currency: 'usd',
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'Credit Card',
          deliveryMessages: ['Please deliver after 6 PM'],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        result = await sendOrderConfirmationEmail(testOrder);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid test type. Use: password-reset, password-reset-confirmation, or order-confirmation' },
          { status: 400 }
        );
    }

    console.log(`[POST /api/test/email] Email test result - success: ${result.success}, error: ${result.error}`);

    return NextResponse.json({
      success: true,
      message: `Email test completed for type: ${type}`,
      result: result,
      timestamp: formatAPITimestamp(new Date()),
    });

  } catch (error) {
    console.error('[POST /api/test/email] Test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: formatAPITimestamp(new Date()),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/email
 * Get email service configuration status
 */
export async function GET() {
  try {
    const config = {
      resendApiKey: process.env.RESEND_API_KEY ? 'Configured ✓' : 'Not configured ✗',
      fromEmail: process.env.RESEND_FROM_EMAIL || 'Not configured',
      timestamp: formatAPITimestamp(new Date()),
    };

    console.log(`[GET /api/test/email] Email service config:`, config);

    return NextResponse.json({
      success: true,
      config: config,
    });

  } catch (error) {
    console.error('[GET /api/test/email] Config check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
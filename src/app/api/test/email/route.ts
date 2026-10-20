import { NextRequest, NextResponse } from 'next/server';
import { sendOrderConfirmationEmail, sendPasswordResetOTP, sendPasswordResetConfirmation, sendPaymentFailedEmail } from '@/lib/email';
import { Order } from '@/types/order';
import { formatAPITimestamp } from '@/lib/apiDateFormat';
import { requireAdmin } from '@/lib/adminAuth';
import { sendCartReminderEmail } from '@/lib/cartReminderEmail';
import { sendStoreCreditEmail } from '@/lib/storeCreditEmail';

/**
 * POST /api/test/email
 * Test endpoint to verify email service functionality
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
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
          totalPaid: 42.47,
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

      case 'store-credit':
      case 'store-credit-full': {
        // a made-up order, sent to the address given; nothing is saved (the full variant is the "entire order credited" email)
        const full = type === 'store-credit-full';
        const sample = { orderId: 'TEST-123456', customerInfo: { name: 'Priya Sharma', email: testEmail, phone: '' } } as unknown as Order;
        const sent = await sendStoreCreditEmail(
          sample,
          full
            ? {
                full: true,
                orderTotal: 55,
                amount: 55,
                balance: 55,
                items: [
                  { name: 'Idli Batter (Saver Combo) 32Oz x 2', quantity: 1, amount: 19.85 },
                  { name: 'Idli Batter (32Oz)', quantity: 1, amount: 11.02 },
                  { name: 'Dosa Batter (Saver Combo) 32Oz x 2', quantity: 1, amount: 19.86 },
                  { name: 'Platform Fee (with tax)', quantity: 1, amount: 1.97 },
                  { name: 'Tip', quantity: 1, amount: 2.3 },
                ],
              }
            : { amount: 19.85, balance: 19.85, items: [{ name: 'Idli Batter (Saver Combo) 32Oz x 2', quantity: 1, amount: 19.85 }] }
        );
        result = { success: sent.success, error: sent.error };
        break;
      }

      case 'cart-reminder': {
        // a sample cart (made-up items), sent to the address given; nothing is saved
        const sent = await sendCartReminderEmail(testEmail, {
          name: 'Priya Sharma',
          total: 76.49,
          items: [
            { date: '2026-10-13', name: 'Chole Masala', quantity: 1, unitPrice: 9.99, lineTotal: 9.99, portion: '12Oz', spice: 'Medium Spice', eco: true },
            { date: '2026-10-13', name: 'Veg Combo (Our Bestseller for Tuesday)', quantity: 1, unitPrice: 26.5, lineTotal: 26.5, eco: true, spice: 'Mild (Kid Friendly)', choices: ['Veg Curry of the Day: Kale Chane (12Oz)', 'Staples: Chapati'] },
            { date: '2026-10-16', name: 'Gajar Ka Halwa', quantity: 2, unitPrice: 20, lineTotal: 40, portion: '16Oz' },
          ],
        });
        result = { success: sent.success, error: sent.error };
        break;
      }

      case 'payment-failed':
        const failedOrder: Order = orderData || {
          _id: 'test-order-id',
          orderId: 'TEST-123456',
          user: 'test-user-id',
          items: [],
          address: {
            street: '123 Test Street',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
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
          totalPaid: 42.47,
          currency: 'usd',
          status: 'cancelled',
          paymentStatus: 'failed',
          paymentMethod: 'Credit Card',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        result = await sendPaymentFailedEmail(
          failedOrder,
          body.failureReason || 'Your card was declined.'
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid test type. Use: password-reset, password-reset-confirmation, order-confirmation, payment-failed, cart-reminder, store-credit, or store-credit-full' },
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
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const emailProvider = process.env.EMAIL_PROVIDER === 'mailtrap' ? 'mailtrap' : 'resend';
    const config = {
      emailProvider,
      resendApiKey: process.env.RESEND_API_KEY ? 'Configured ✓' : 'Not configured ✗',
      mailtrapApiToken: process.env.MAILTRAP_API_TOKEN ? 'Configured ✓' : 'Not configured ✗',
      mailtrapUseSandbox: process.env.MAILTRAP_USE_SANDBOX === 'true',
      mailtrapInboxId: process.env.MAILTRAP_INBOX_ID || 'Not configured',
      fromEmail: process.env.RESEND_FROM_EMAIL || 'Not configured',
      mailtrapFromEmail: process.env.MAILTRAP_FROM_EMAIL || 'hello@demomailtrap.co (default)',
      mailtrapFromName: process.env.MAILTRAP_FROM_NAME || 'Nikfoods Test (default)',
      orderConfirmationBccEmail: process.env.ORDER_CONFIRMATION_BCC_EMAIL || 'Not configured',
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
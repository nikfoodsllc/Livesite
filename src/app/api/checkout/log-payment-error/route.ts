import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { parseClientPaymentError } from '@/lib/server/stripePaymentInfo';

/**
 * POST /api/checkout/log-payment-error
 * The checkout page reports errors that only the browser sees (a declined card message, a form
 * validation error, a failed order or payment-session request) so they can be found later.
 * Best effort: always answers 200 for well-formed requests and never blocks the checkout.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const verifyResult = jwtHandler.verifyToken(authHeader.replace('Bearer ', ''));
    if (!verifyResult.success || !verifyResult.payload) {
      return NextResponse.json({ success: false, error: 'Invalid authentication token' }, { status: 401 });
    }
    const userId = verifyResult.payload.userId;

    const error = parseClientPaymentError(await request.json().catch(() => null));
    if (!error) {
      return NextResponse.json({ success: false, error: 'Invalid error report' }, { status: 400 });
    }

    const at = new Date();
    console.warn('[checkout] Payment error reported by the browser', { userId, ...error });

    // Always keep a record, with the order if the customer already had one
    await db.create('paymentErrorLogs', { userId, ...error, at });

    // Attach it to the customer's own order so it shows up next to the order in the admin
    if (error.orderId) {
      const entry = {
        stage: error.stage,
        code: error.code,
        declineCode: error.declineCode,
        type: error.type,
        message: error.message,
        paymentIntentId: error.paymentIntentId,
        at,
      };
      const collection = await db.getCollectionForOperations('orders');
      await collection.updateOne(
        { orderId: error.orderId, user: userId },
        { $push: { clientPaymentErrors: { $each: [entry], $slice: -10 } }, $set: { updatedAt: at } } as never
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[checkout] Could not store a payment error report:', err);
    return NextResponse.json({ success: true }); // reporting must never get in the way
  }
}
